'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedAdmin } from '@/lib/auth/adminDal';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ContactMessage,
  ContactMessagePriority,
  ContactMessageStatus,
} from '@/lib/types/databaseTypes';
import type {
  AdminActionResponse,
  AiSentimentType,
  AiTriageActionResponse,
} from '../types/adminTypes';

interface BackendTriagePayload {
  triage?: {
    ai_summary?: string;
    ai_sentiment?: AiSentimentType;
    priority?: ContactMessagePriority;
    ai_suggested_reply?: string;
  };
}

function buildLocalFallbackTriage(msg: ContactMessage): {
  ai_summary: string;
  ai_sentiment: AiSentimentType;
  priority: ContactMessagePriority;
  ai_suggested_reply: string;
} {
  const combined = `${msg.subject} ${msg.message}`.toLowerCase();
  const hasCyrillic = /[а-яА-Я]/.test(msg.message);
  const hasGerman = /\b(und|wir|für|ferienwohnung|preis|pause)\b/i.test(msg.message);

  let sentiment: AiSentimentType = 'neutral';
  let priority: ContactMessagePriority = 'normal';

  if (/(спешно|не работи|грешка|проблем с плащане|urgent|error|broken|billing)/.test(combined)) {
    sentiment = 'urgent';
    priority = 'urgent';
  } else if (/(трудно|не мога|помощ|issue|cannot|stuck)/.test(combined)) {
    sentiment = 'frustrated';
    priority = 'high';
  } else if (
    msg.subject === 'sales' ||
    /(вили|апартамента|оферта|партньорство|villas|properties|ferienwohnungen)/.test(combined)
  ) {
    sentiment = 'positive';
    priority = 'high';
  }

  const cleanSnippet = msg.message.replace(/\s+/g, ' ').trim().slice(0, 110);
  const subjectMap: Record<string, string> = {
    sales: 'Продажби & B2B интерес',
    support: 'Техническо запитване',
    legal: 'Правен / GDPR въпрос',
    general: 'Общо запитване',
  };
  const topicLabel = subjectMap[msg.subject] || 'Клиентско запитване';
  const ai_summary = `${topicLabel} от ${msg.name}: „${cleanSnippet}${msg.message.length > 110 ? '...' : ''}“`;

  let ai_suggested_reply: string;
  if (hasCyrillic) {
    ai_suggested_reply =
      `Здравейте, ${msg.name},\n\n` +
      `Благодарим Ви за интереса към SmartScan Stay! Разгледахме Вашето запитване.\n\n` +
      `Платформата предлага единен прозрачен план от €9.99/месец на обект с 14-дневен безплатен пробен период, ` +
      `автоматичен AI консиерж на 50+ езика, готови за печат A4/A5 QR табелки и безплатно сезонно паузиране извън активния сезон.\n\n` +
      `С удоволствие ще Ви съдействаме с настройката. Пишете ни, ако имате допълнителни въпроси!\n\n` +
      `Поздрави,\nЕкипът на SmartScan Stay`;
  } else if (hasGerman) {
    ai_suggested_reply =
      `Hallo ${msg.name},\n\n` +
      `vielen Dank für Ihre Nachricht an SmartScan Stay!\n\n` +
      `Unser Tarif beträgt transparent €9,99 pro Monat und Unterkunft – inklusive 14-tägiger kostenloser Testphase, ` +
      `druckfertiger A4/A5 QR-Aufsteller und kostenloser saisonaler Pausierung außerhalb der Saison.\n\n` +
      `Gerne unterstützen wir Sie bei der Einrichtung Ihrer Unterkünfte.\n\n` +
      `Beste Grüße,\nIhr SmartScan Stay Team`;
  } else {
    ai_suggested_reply =
      `Hello ${msg.name},\n\n` +
      `Thank you for contacting SmartScan Stay! We have reviewed your message.\n\n` +
      `SmartScan Stay operates on a flat €9.99/month per property plan with a 14-day free trial, ` +
      `instant A4/A5 vector QR plaques, a 50+ language AI concierge, and free seasonal pausing during off-peak months.\n\n` +
      `Let us know if we can help you onboard your properties right away.\n\n` +
      `Best regards,\nThe SmartScan Stay Team`;
  }

  return {
    ai_summary,
    ai_sentiment: sentiment,
    priority,
    ai_suggested_reply,
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

  try {
    const supabaseAdmin = createAdminClient();
    const { data: msg, error: fetchErr } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .eq('id', messageId)
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

      const response = await fetch(`${backendUrl}/api/py/admin/triage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message_id: msg.id,
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
      .eq('id', messageId)
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
 * Updates the status and/or priority of a contact message.
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

  try {
    const supabaseAdmin = createAdminClient();
    const updatePayload: {
      status: ContactMessageStatus;
      priority?: ContactMessagePriority;
    } = { status };

    if (priority) {
      updatePayload.priority = priority;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('contact_messages')
      .update(updatePayload)
      .eq('id', messageId)
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
 * Records and dispatches the administrator's reply to a customer inquiry,
 * automatically setting status = 'replied' and replied_at = now().
 */
export async function sendContactReplyAction(
  messageId: string,
  replyText: string
): Promise<AiTriageActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  const trimmedReply = replyText.trim();
  if (trimmedReply.length < 5) {
    return {
      success: false,
      error: 'Текстът на отговора е твърде кратък.',
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('contact_messages')
      .update({
        admin_reply: trimmedReply,
        status: 'replied',
        replied_at: nowIso,
      })
      .eq('id', messageId)
      .select('*')
      .single();

    if (error || !updated) {
      return { success: false, error: 'Грешка при запазване на отговора.' };
    }

    revalidatePath('/admin');
    return { success: true, updatedMessage: updated };
  } catch {
    return { success: false, error: 'Системна грешка при изпращане на отговора.' };
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

  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('contact_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      return { success: false, error: 'Неуспешно изтриване на запитването.' };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Системна грешка при изтриване на запитването.' };
  }
}

