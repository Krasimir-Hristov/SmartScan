import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getHostSpaces, getSpaceKnowledgeChunks } from '@/lib/dal';
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

  const spaces = await getHostSpaces(user.id);
  const initialChunks =
    spaces.length > 0 ? await getSpaceKnowledgeChunks(spaces[0].id) : [];

  return (
    <DashboardPage
      user={user}
      initialSpaces={spaces}
      initialKnowledgeChunks={initialChunks}
    />
  );
};

export default Page;
