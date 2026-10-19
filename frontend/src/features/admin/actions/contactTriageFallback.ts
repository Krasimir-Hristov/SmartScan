import type {
  ContactMessage,
  ContactMessagePriority,
} from '@/lib/types/databaseTypes';
import type { AiSentimentType } from '../types/adminTypes';

export interface LocalFallbackTriageResult {
  ai_summary: string;
  ai_sentiment: AiSentimentType;
  priority: ContactMessagePriority;
  ai_suggested_reply: string;
}

export function buildLocalFallbackTriage(msg: ContactMessage): LocalFallbackTriageResult {
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
