import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/dal';
import { DashboardPage } from '@/features/dashboard';

export const metadata: Metadata = {
  title: 'Контролен панел | SmartScan Stay',
  description: 'Управлявайте вашите имоти, AI консиерж и QR плакети в реално време.',
};

const Page = async () => {
  // Defense in Depth: Server-side DAL authentication check
  const user = await getCurrentUser();

  if (!user) {
    redirect('/?auth=required');
  }

  return <DashboardPage user={user} />;
};

export default Page;
