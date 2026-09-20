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
 * Normalises `NEXT_PUBLIC_SITE_URL` to its bare origin and rejects anything
 * that is not an absolute http(s) URL, so a malformed value (unsupported
 * protocol, path component, typo) can never leak into a printed QR code.
 */
const parseConfiguredOrigin = (configured: string | undefined): string => {
  const value = (configured || '').trim();
  if (!value) return '';

  try {
    const parsed = new URL(value);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    return isHttp ? parsed.origin : '';
  } catch {
    return '';
  }
};

/**
 * Resolves the canonical public origin that will be encoded inside printed QR
 * codes. Production must pin the domain through `NEXT_PUBLIC_SITE_URL`: request
 * headers are client-controllable, so the validated request host is treated as
 * a development convenience only.
 */
const resolveSiteOrigin = async (): Promise<string> => {
  const configured = parseConfiguredOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') return '';

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
