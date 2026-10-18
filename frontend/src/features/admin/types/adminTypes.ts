import type {
  ContactMessage,
  ContactMessagePriority,
  ContactMessageStatus,
  Space,
} from '@/lib/types/databaseTypes';

export type AdminTabId = 'overview' | 'contacts' | 'hosts';

export type AiSentimentType = 'positive' | 'neutral' | 'frustrated' | 'urgent';

export interface AdminKpiMetrics {
  totalHosts: number;
  totalSpaces: number;
  activePaidSpaces: number;
  trialSpaces: number;
  pausedOrCanceledSpaces: number;
  estimatedMrrEur: number;
  totalKnowledgeChunks: number;
  totalInquiries: number;
  unreadInquiries: number;
  urgentInquiries: number;
  repliedInquiries: number;
  totalQrScans: number;
  totalConciergeChats: number;
  autoResolvedRatePercent: number;
}

export interface AdminSpaceSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  subscriptionStatus: Space['subscription_status'];
  stripeSubscriptionId: string | null;
  knowledgeCount: number;
  createdAt: string;
}

export interface AdminHostDirectoryItem {
  id: string;
  email: string;
  fullName: string | null;
  isPlatformAdmin: boolean;
  isTestAdmin?: boolean;
  stripeCustomerId: string | null;
  trialEndsAt: string | null;
  trialClaimedAt: string | null;
  isTrialOpen: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  spaces: AdminSpaceSummary[];
}

export interface AdminDashboardSnapshot {
  adminEmail: string;
  adminId: string;
  isDevEnvironment: boolean;
  kpis: AdminKpiMetrics;
  contacts: ContactMessage[];
  hosts: AdminHostDirectoryItem[];
}

export interface AdminActionResponse {
  success: boolean;
  error?: string;
}

export interface AiTriageActionResponse extends AdminActionResponse {
  updatedMessage?: ContactMessage;
  source?: 'ai' | 'fallback';
}

export interface ContactFilterState {
  search: string;
  status: ContactMessageStatus | 'all';
  priority: ContactMessagePriority | 'all';
  subject: string;
}
