export type LegalCalloutType = 'info' | 'warning' | 'shield';

export interface LegalCallout {
  type: LegalCalloutType;
  title?: string;
  text: string;
}

export interface LegalClause {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
  callout?: LegalCallout;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  effectiveDate: string;
  summary: string;
  clauses: LegalClause[];
}

export type SupportedLegalDoc = 'terms' | 'privacy';
