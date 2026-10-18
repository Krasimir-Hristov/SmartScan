export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SpaceType = 'stay' | 'menu' | 'real_estate' | 'auto' | 'insurance';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled';
export type ContactMessageStatus = 'unread' | 'read' | 'archived' | 'replied';
export type ContactMessagePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Strongly typed settings structure for stay_settings JSONB column.
 */
export interface StaySettings {
  [key: string]: Json | undefined;
  wifiSsid?: string;
  wifiPassword?: string;
  taxiAddress?: string;
  taxiPhone?: string;
  whatsappPhone?: string;
  whatsappPrefilledMessage?: string;
  emergencyNumber?: string;
  checkInTime?: string;
  checkOutTime?: string;
  keyboxCode?: string;
  nightSilenceStart?: string;
  nightSilenceEnd?: string;
  afternoonRestStart?: string;
  afternoonRestEnd?: string;
  customRules?: string;
  tagline?: string;
}

export interface Database {
  public: {
    Tables: {
      spaces: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          slug: string;
          space_type: SpaceType;
          is_active: boolean;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          subscription_status: SubscriptionStatus;
          trial_ends_at: string | null;
          stay_settings: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          slug: string;
          space_type?: SpaceType;
          is_active?: boolean;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          stay_settings?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          name?: string;
          slug?: string;
          space_type?: SpaceType;
          is_active?: boolean;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          stay_settings?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spaces_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      knowledge_chunks: {
        Row: {
          id: string;
          space_id: string;
          title: string;
          content: string;
          category: string;
          embedding: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          title: string;
          content: string;
          category?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          title?: string;
          content?: string;
          category?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'knowledge_chunks_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          }
        ];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          status: ContactMessageStatus;
          priority: ContactMessagePriority;
          ai_summary: string | null;
          ai_sentiment: string | null;
          ai_suggested_reply: string | null;
          admin_reply: string | null;
          metadata: Json;
          ip_hash: string | null;
          user_agent: string | null;
          replied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          status?: ContactMessageStatus;
          priority?: ContactMessagePriority;
          ai_summary?: string | null;
          ai_sentiment?: string | null;
          ai_suggested_reply?: string | null;
          admin_reply?: string | null;
          metadata?: Json;
          ip_hash?: string | null;
          user_agent?: string | null;
          replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string;
          message?: string;
          status?: ContactMessageStatus;
          priority?: ContactMessagePriority;
          ai_summary?: string | null;
          ai_sentiment?: string | null;
          ai_suggested_reply?: string | null;
          admin_reply?: string | null;
          metadata?: Json;
          ip_hash?: string | null;
          user_agent?: string | null;
          replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
          trial_ends_at: string | null;
          trial_claimed_at: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
          trial_ends_at?: string | null;
          trial_claimed_at?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
          trial_ends_at?: string | null;
          trial_claimed_at?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      space_analytics_events: {
        Row: {
          id: string;
          space_id: string;
          event_type: 'qr_scan' | 'chat_message' | 'resolved_query';
          locale: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          event_type: 'qr_scan' | 'chat_message' | 'resolved_query';
          locale?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          event_type?: 'qr_scan' | 'chat_message' | 'resolved_query';
          locale?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_guest_space_by_slug: {
        Args: {
          space_slug: string;
        };
        Returns: {
          id: string;
          name: string;
          slug: string;
          space_type: SpaceType;
          stay_settings: Json;
        }[];
      };
      match_space_knowledge: {
        Args: {
          filter_space_id: string;
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          space_id: string;
          title: string;
          content: string;
          category: string;
          similarity: number;
        }[];
      };
      submit_contact_message: {
        Args: {
          p_name: string;
          p_email: string;
          p_subject: string;
          p_message: string;
          p_phone?: string | null;
          p_ip_hash?: string | null;
          p_user_agent?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      space_type: SpaceType;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Space = Database['public']['Tables']['spaces']['Row'];
export type SpaceInsert = Database['public']['Tables']['spaces']['Insert'];
export type SpaceUpdate = Database['public']['Tables']['spaces']['Update'];

export type KnowledgeChunk = Database['public']['Tables']['knowledge_chunks']['Row'];
export type KnowledgeChunkInsert = Database['public']['Tables']['knowledge_chunks']['Insert'];
export type KnowledgeChunkUpdate = Database['public']['Tables']['knowledge_chunks']['Update'];

export type GuestSpace = Database['public']['Functions']['get_guest_space_by_slug']['Returns'][number];
export type MatchedKnowledge = Database['public']['Functions']['match_space_knowledge']['Returns'][number];

export type ContactMessage = Database['public']['Tables']['contact_messages']['Row'];
export type ContactMessageInsert = Database['public']['Tables']['contact_messages']['Insert'];
export type ContactMessageUpdate = Database['public']['Tables']['contact_messages']['Update'];

export type HostRecord = Database['public']['Tables']['hosts']['Row'];
export type SpaceAnalyticsEvent = Database['public']['Tables']['space_analytics_events']['Row'];
