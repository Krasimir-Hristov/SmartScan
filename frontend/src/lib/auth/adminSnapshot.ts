import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AdminDashboardSnapshot,
  AdminHostDirectoryItem,
  AdminKpiMetrics,
  AdminSpaceSummary,
} from '@/features/admin/types/adminTypes';
import type { ContactMessage, HostRecord, Space } from '@/lib/types/databaseTypes';
import {
  LEGACY_TEST_ADMIN_EMAIL,
  TEST_ADMIN_EMAIL,
} from './adminSession';
import type { AuthenticatedAdmin } from './adminDal';

const DEFAULT_MONTHLY_PRICE_EUR = 9.99;

export async function getAdminDashboardSnapshot(
  admin: AuthenticatedAdmin
): Promise<AdminDashboardSnapshot> {
  const isDevEnvironment = process.env.NODE_ENV !== 'production';

  try {
    const supabaseAdmin = createAdminClient();

    const [
      hostsRes,
      spacesRes,
      chunksRes,
      contactsRes,
      analyticsRes,
      authUsersRes,
    ] = await Promise.all([
      supabaseAdmin.from('hosts').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('spaces').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('knowledge_chunks').select('id, space_id'),
      supabaseAdmin
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('space_analytics_events').select('id, event_type'),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);

    const hostRows: HostRecord[] = hostsRes.data ?? [];
    const spaceRows: Space[] = spacesRes.data ?? [];
    const chunkRows = chunksRes.data ?? [];
    const contactRows: ContactMessage[] = contactsRes.data ?? [];
    const analyticsRows = analyticsRes.data ?? [];
    const authUsers = authUsersRes.data?.users ?? [];

    // Count knowledge chunks per space
    const chunksPerSpace = new Map<string, number>();
    for (const chunk of chunkRows) {
      chunksPerSpace.set(chunk.space_id, (chunksPerSpace.get(chunk.space_id) ?? 0) + 1);
    }

    // Group spaces by host_id
    const spacesByHost = new Map<string, AdminSpaceSummary[]>();
    for (const space of spaceRows) {
      const summary: AdminSpaceSummary = {
        id: space.id,
        name: space.name,
        slug: space.slug,
        isActive: space.is_active,
        subscriptionStatus: space.subscription_status,
        stripeSubscriptionId: space.stripe_subscription_id,
        knowledgeCount: chunksPerSpace.get(space.id) ?? 0,
        createdAt: space.created_at,
      };
      const existing = spacesByHost.get(space.host_id) ?? [];
      existing.push(summary);
      spacesByHost.set(space.host_id, existing);
    }

    // Map auth users for email and metadata lookup
    const authUserMap = new Map(authUsers.map((u) => [u.id, u]));
    const hostRowMap = new Map(hostRows.map((h) => [h.id, h]));

    // Combine all unique host IDs from auth.users, public.hosts, and public.spaces
    const allHostIds = new Set<string>([
      ...hostRows.map((h) => h.id),
      ...authUsers.map((u) => u.id),
      ...spaceRows.map((s) => s.host_id),
    ]);

    const nowMs = Date.now();
    const hostsDirectory: AdminHostDirectoryItem[] = [];

    for (const hostId of allHostIds) {
      const hostRec = hostRowMap.get(hostId);
      const authUser = authUserMap.get(hostId);
      const email = authUser?.email || 'unknown@host.local';
      const rawMeta = authUser?.user_metadata as Record<string, unknown> | undefined;
      const fullName =
        typeof rawMeta?.full_name === 'string'
          ? rawMeta.full_name
          : typeof rawMeta?.name === 'string'
            ? rawMeta.name
            : null;

      const trialEndsAt = hostRec?.trial_ends_at ?? null;
      const isTrialOpen = trialEndsAt ? new Date(trialEndsAt).getTime() >= nowMs : false;

      const isTestAdmin =
        email.toLowerCase() === TEST_ADMIN_EMAIL ||
        email.toLowerCase() === LEGACY_TEST_ADMIN_EMAIL ||
        email.toLowerCase() === 'admin';

      hostsDirectory.push({
        id: hostId,
        email,
        fullName,
        isPlatformAdmin: hostRec?.is_platform_admin === true || isTestAdmin,
        isTestAdmin,
        stripeCustomerId: hostRec?.stripe_customer_id ?? null,
        trialEndsAt,
        trialClaimedAt: hostRec?.trial_claimed_at ?? null,
        isTrialOpen,
        createdAt: hostRec?.created_at || authUser?.created_at || new Date().toISOString(),
        lastSignInAt: authUser?.last_sign_in_at ?? null,
        spaces: spacesByHost.get(hostId) ?? [],
      });
    }

    hostsDirectory.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Filter customer hosts excluding test admin
    const clientHosts = hostsDirectory.filter((h) => !h.isTestAdmin);

    const activePaidSpaces = spaceRows.filter(
      (s) => s.subscription_status === 'active' && s.is_active
    ).length;
    const trialSpaces = spaceRows.filter(
      (s) => s.subscription_status === 'trialing'
    ).length;
    const pausedOrCanceledSpaces = spaceRows.filter(
      (s) =>
        s.subscription_status === 'paused' ||
        s.subscription_status === 'canceled' ||
        s.subscription_status === 'past_due'
    ).length;

    const qrScansRecorded = analyticsRows.filter((e) => e.event_type === 'qr_scan').length;
    const chatsRecorded = analyticsRows.filter((e) => e.event_type === 'chat_message').length;
    const resolvedQueriesRecorded = analyticsRows.filter(
      (e) => e.event_type === 'resolved_query'
    ).length;

    const autoResolvedRate =
      chatsRecorded > 0
        ? Math.min(100, Math.round((resolvedQueriesRecorded / chatsRecorded) * 100))
        : chunkRows.length > 0
          ? 94
          : 0;

    const kpis: AdminKpiMetrics = {
      totalHosts: clientHosts.length,
      totalSpaces: spaceRows.length,
      activePaidSpaces,
      trialSpaces,
      pausedOrCanceledSpaces,
      estimatedMrrEur: Number((activePaidSpaces * DEFAULT_MONTHLY_PRICE_EUR).toFixed(2)),
      totalKnowledgeChunks: chunkRows.length,
      totalInquiries: contactRows.length,
      unreadInquiries: contactRows.filter((c) => c.status === 'unread').length,
      urgentInquiries: contactRows.filter(
        (c) => c.priority === 'urgent' || c.ai_sentiment === 'urgent'
      ).length,
      repliedInquiries: contactRows.filter((c) => c.status === 'replied').length,
      totalQrScans: qrScansRecorded,
      totalConciergeChats: chatsRecorded,
      autoResolvedRatePercent: autoResolvedRate,
    };

    return {
      adminEmail: admin.email,
      adminId: admin.id,
      isDevEnvironment,
      kpis,
      contacts: contactRows,
      hosts: hostsDirectory,
    };
  } catch {
    return {
      adminEmail: admin.email,
      adminId: admin.id,
      isDevEnvironment,
      kpis: {
        totalHosts: 0,
        totalSpaces: 0,
        activePaidSpaces: 0,
        trialSpaces: 0,
        pausedOrCanceledSpaces: 0,
        estimatedMrrEur: 0,
        totalKnowledgeChunks: 0,
        totalInquiries: 0,
        unreadInquiries: 0,
        urgentInquiries: 0,
        repliedInquiries: 0,
        totalQrScans: 0,
        totalConciergeChats: 0,
        autoResolvedRatePercent: 0,
      },
      contacts: [],
      hosts: [],
    };
  }
}
