/**
 * TypeScript types and interfaces for the Live Speech & Knowledge Ingestion feature.
 */

export type CardCategory =
  | 'wifi'
  | 'rules'
  | 'appliances'
  | 'recommendations'
  | 'general'
  | 'access'
  | 'parking';

export interface StructuredCard {
  title: string;
  category: CardCategory;
  content: string;
}

export interface IngestTextResponse {
  success: boolean;
  space_id: string;
  cards_count: number;
  cards: StructuredCard[];
}
