import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getAdminDashboardSnapshot,
  getAuthenticatedAdmin,
} from '@/lib/auth/adminDal';
import { AdminDashboardPage } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Owner Admin Control Plane | SmartScan Stay',
  description:
    'Централизиран административен панел за управление на запитвания, AI Triaging, хазяи и KPI аналитика.',
  robots: {
    index: false,
    follow: false,
  },
};

const AdminPage = async () => {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  const snapshot = await getAdminDashboardSnapshot(admin);

  return <AdminDashboardPage initialSnapshot={snapshot} />;
};

export default AdminPage;
