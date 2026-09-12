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
