import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, getHostSpaces, getSpaceKnowledgeChunks } from '@/lib/dal';
import { DashboardPage } from '@/features/dashboard';

export const metadata: Metadata = {
  title: 'Контролен панел | SmartScan Stay',
  description: 'Управлявайте вашите имоти, AI консиерж и QR плакети в реално време.',
};

const SAFE_HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Resolves the canonical public origin that will be encoded inside printed QR
 * codes: the configured production URL first, then the validated request host.
 */
const resolveSiteOrigin = async (): Promise<string> => {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (configured) return configured;

  const requestHeaders = await headers();
  const host = (
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    ''
  )
    .split(',')[0]
    .trim();

  if (!SAFE_HOST_PATTERN.test(host)) return '';

  const protocol = (
    requestHeaders.get('x-forwarded-proto') ?? 'https'
  )
    .split(',')[0]
    .trim();

  return `${protocol === 'http' ? 'http' : 'https'}://${host}`;
};

const Page = async () => {
  // Defense in Depth: Server-side DAL authentication check
  const user = await getCurrentUser();

  if (!user) {
    redirect('/?auth=required');
  }

  const spaces = await getHostSpaces(user.id);
  const initialChunks =
    spaces.length > 0 ? await getSpaceKnowledgeChunks(spaces[0].id) : [];
  const siteOrigin = await resolveSiteOrigin();

  return (
    <DashboardPage
      user={user}
      initialSpaces={spaces}
      initialKnowledgeChunks={initialChunks}
      siteOrigin={siteOrigin}
    />
  );
};

export default Page;
