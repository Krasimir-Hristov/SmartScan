export interface WifiDetails {
  ssid: string;
  password: string;
  encryption?: string;
}

export interface FastActionContacts {
  taxiAddress: string;
  taxiPhone: string;
  whatsappPhone: string;
  whatsappPrefilledMessage?: string;
  emergencyNumber?: string;
}

export interface StaySchedule {
  checkInTime: string;
  checkOutTime: string;
  keyboxCode?: string;
}

export interface QuietHours {
  nightStart: string;
  nightEnd: string;
  siestaStart?: string;
  siestaEnd?: string;
}

export interface KnowledgeChipItem {
  id: string;
  title: string;
  category: string;
}

export interface SpaceStayData {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  badge?: string;
  wifi: WifiDetails;
  contacts: FastActionContacts;
  schedule: StaySchedule;
  quietHours?: QuietHours;
  hostName?: string;
  knowledgeChips?: KnowledgeChipItem[];
}
