export type ContactSubjectKey = 'general' | 'sales' | 'support' | 'legal';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: ContactSubjectKey;
  message: string;
  honeypot?: string;
  consent: boolean;
}

export interface ContactActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ContactFormData, string>>;
}
