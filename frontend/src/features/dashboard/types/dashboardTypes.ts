export interface DashboardUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
    [key: string]: unknown;
  };
}

export interface MetricItem {
  id: string;
  label: string;
  value: string;
  subtext: string;
  trend?: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  location: string;
  slug: string;
  status: 'active' | 'paused' | 'draft';
  languagesCount: number;
  wifiName: string;
  todayScans: number;
}

export interface CreateSpaceInput {
  name: string;
  taxiAddress?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  taxiPhone?: string;
  whatsappPhone?: string;
  emergencyNumber?: string;
  nightSilenceStart?: string;
  nightSilenceEnd?: string;
  afternoonRestStart?: string;
  afternoonRestEnd?: string;
  checkInTime?: string;
  checkOutTime?: string;
  keyboxCode?: string;
}

export interface UpdateSpaceInput extends CreateSpaceInput {
  id: string;
  slug?: string;
  isActive?: boolean;
}

export interface CreateKnowledgeInput {
  spaceId: string;
  title: string;
  content: string;
  category?:
    | 'rules'
    | 'appliances'
    | 'parking'
    | 'recommendations'
    | 'general'
    | 'wifi'
    | 'access'
    | 'pets';
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
