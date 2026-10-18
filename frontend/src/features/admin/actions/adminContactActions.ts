'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthenticatedAdmin } from '@/lib/auth/adminDal';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ContactMessagePriority,
  ContactMessageStatus,
} from '@/lib/types/databaseTypes';
import type {
  AdminActionResponse,
  AiSentimentType,
  AiTriageActionResponse,
} from '../types/adminTypes';
import { buildLocalFallbackTriage } from './contactTriageFallback';

const uuidSchema = z.string().uuid({ message: 'Невалиден идентификатор на съобщение.' });

const updateStatusSchema = z.object({
  messageId: uuidSchema,
  status: z.enum(['unread', 'read', 'replied', 'archived'] as const, {
    message: 'Невалиден статус на съобщение.',
  }),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'] as const, {
      message: 'Невалиден приоритет.',
    })
    .optional(),
});

const sendReplySchema = z.object({
  messageId: uuidSchema,
  replyText: z.string().trim().min(5, { message: 'Текстът на отговора е твърде кратък.' }),
});

interface BackendTriagePayload {
  triage?: {
    ai_summary?: string;
    ai_sentiment?: AiSentimentType;
    priority?: ContactMessagePriority;
    ai_suggested_reply?: string;
  };
}

/**
 * Triggers AI Triaging (Gemini 2.5 Flash via FastAPI backend with resilient fallback)
 * and persists ai_summary, ai_sentiment, priority, and ai_suggested_reply.
 */
export async function runContactAiTriageAction(
  messageId: string
): Promise<AiTriageActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  const validIdResult = uuidSchema.safeParse(messageId);
  if (!validIdResult.success) {
    return {
      success: false,
      error: validIdResult.error.issues[0]?.message || 'Невалиден ID.',
    };
  }
  const validMessageId = validIdResult.data;

  try {
    const supabaseAdmin = createAdminClient();
    const { data: msg, error: fetchErr } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .eq('id', validMessageId)
      .maybeSingle();

    if (fetchErr || !msg) {
      return { success: false, error: 'Съобщението не беше намерено.' };
    }

    let triageData = buildLocalFallbackTriage(msg);

    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
    const proxySecret = process.env.BACKEND_PROXY_SECRET || '';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (proxySecret) {
        headers['x-internal-auth'] = proxySecret;
      }

      // Do not send message_id so FastAPI does not mutate DB; this action remains the sole writer
      const response = await fetch(`${backendUrl}/api/py/admin/triage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: msg.name,
          email: msg.email,
          subject: msg.subject,
          message: msg.message,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const json = (await response.json()) as BackendTriagePayload;
        if (json.triage?.ai_summary && json.triage?.ai_suggested_reply) {
          triageData = {
            ai_summary: json.triage.ai_summary,
            ai_sentiment: json.triage.ai_sentiment || triageData.ai_sentiment,
            priority: json.triage.priority || triageData.priority,
            ai_suggested_reply: json.triage.ai_suggested_reply,
          };
        }
      }
    } catch {
      // Uses deterministic local fallback if FastAPI backend is offline
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('contact_messages')
      .update({
        ai_summary: triageData.ai_summary,
        ai_sentiment: triageData.ai_sentiment,
        priority: triageData.priority,
        ai_suggested_reply: triageData.ai_suggested_reply,
      })
      .eq('id', validMessageId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return { success: false, error: 'Грешка при запис на AI анализа.' };
    }

    revalidatePath('/admin');
    return {
      success: true,
      updatedMessage: updated,
    };
  } catch {
    return {
      success: false,
      error: 'Възникна грешка при стартиране на AI триажа.',
    };
  }
}

/**
 * Updates the status and/or priority of a contact message after strict Zod validation.
 */
export async function updateContactStatusAction(
  messageId: string,
  status: ContactMessageStatus,
  priority?: ContactMessagePriority
): Promise<AiTriageActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  const validation = updateStatusSchema.safeParse({ messageId, status, priority });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Невалидни входни параметри.',
    };
  }

  const { messageId: validId, status: validStatus, priority: validPriority } = validation.data;

  try {
    const supabaseAdmin = createAdminClient();
    const updatePayload: {
      status: ContactMessageStatus;
      priority?: ContactMessagePriority;
    } = { status: validStatus };

    if (validPriority) {
      updatePayload.priority = validPriority;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('contact_messages')
      .update(updatePayload)
      .eq('id', validId)
      .select('*')
      .single();

    if (error || !updated) {
      return { success: false, error: 'Неуспешно обновяване на статуса.' };
    }

    revalidatePath('/admin');
    return { success: true, updatedMessage: updated };
  } catch {
    return { success: false, error: 'Системна грешка при обновяване.' };
  }
}

/**
 * Persists the administrator's reply text and marks the inquiry as replied (status = 'replied').
 * Note: Delivery to the recipient is handled through the composer's mailto client link.
 */
export async function sendContactReplyAction(
  messageId: string,
  replyText: string
): Promise<AiTriageActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  const validation = sendReplySchema.safeParse({ messageId, replyText });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Невалиден отговор.',
    };
  }

  const { messageId: validId, replyText: validReply } = validation.data;

  try {
    const supabaseAdmin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('contact_messages')
      .update({
        admin_reply: validReply,
        status: 'replied',
        replied_at: nowIso,
      })
      .eq('id', validId)
      .select('*')
      .single();

    if (error || !updated) {
      return { success: false, error: 'Грешка при запазване на отговора.' };
    }

    revalidatePath('/admin');
    return { success: true, updatedMessage: updated };
  } catch {
    return { success: false, error: 'Системна грешка при запазване на отговора.' };
  }
}

/**
 * Seeds 3 realistic multi-language inquiries for testing AI Triaging and Inbox workflows.
 */
export async function seedSampleContactInquiriesAction(): Promise<AdminActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const samples = [
      {
        name: 'Калоян Димитров',
        email: 'k.dimitrov@sozopol-villas.bg',
        phone: '+359 888 412 900',
        subject: 'sales',
        message:
          'Здравейте! Управляваме комплекс от 6 къщи за гости в Созопол. Искаме да внедрим SmartScan Stay за летния сезон, а през зимата да използваме сезонното паузиране. Може ли да тестваме първо с един обект и да разпечатаме A5 табелките?',
        status: 'unread' as const,
        priority: 'high' as const,
        ai_summary:
          'Собственик на 6 къщи за гости в Созопол иска да стартира със SmartScan Stay за летния сезон и пита за A5 табелки и зимно паузиране.',
        ai_sentiment: 'positive',
        ai_suggested_reply:
          'Здравейте, Калоян,\n\nБлагодарим Ви за интереса към SmartScan Stay! Да, можете да стартирате веднага с 14-дневен безплатен пробен период, да генерирате векторните A5 PDF табелки от таблото и да добавите останалите къщи по всяко време (€9.99/месец на обект). Извън летния сезон можете да паузирате обектите безплатно, като всички настройки и QR кодове се запазват.\n\nПоздрави,\nЕкипът на SmartScan Stay',
      },
      {
        name: 'Markus Weber',
        email: 'm.weber@alpenchalets.de',
        phone: '+49 171 5542109',
        subject: 'general',
        message:
          'Hallo! Wir vermieten 3 Ferienwohnungen in Tirol. Antworte der KI-Concierge automatisch auf Deutsch, Englisch und Italienisch, wenn wir die Hausregeln nur einmal per Sprachnotiz eingeben?',
        status: 'unread' as const,
        priority: 'normal' as const,
      },
      {
        name: 'Elena Papadopoulou',
        email: 'elena@aegean-suites.gr',
        phone: '+30 694 821 3300',
        subject: 'support',
        message:
          'Urgent question: We have guests checking in tomorrow morning at our villa in Halkidiki and I want to update the keybox PIN code. Does the QR code stay the same if I edit the PIN in the dashboard?',
        status: 'unread' as const,
        priority: 'urgent' as const,
      },
    ];

    const { error } = await supabaseAdmin.from('contact_messages').insert(samples);
    if (error) {
      return { success: false, error: 'Неуспешно добавяне на примерни запитвания.' };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Грешка при генериране на примерни данни.' };
  }
}

/**
 * Permanently deletes a contact message from the database.
 */
export async function deleteContactMessageAction(
  messageId: string
): Promise<AdminActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  const validation = uuidSchema.safeParse(messageId);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Невалиден ID.',
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('contact_messages')
      .delete()
      .eq('id', validation.data);

    if (error) {
      return { success: false, error: 'Неуспешно изтриване на запитването.' };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Системна грешка при изтриване на запитването.' };
  }
}
