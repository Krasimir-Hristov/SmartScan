import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getAdminDashboardSnapshot,
  getAuthenticatedAdmin,
} from '@/lib/auth/adminDal';
import { AdminDashboardPage } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Управление на Запитвания & AI Triaging | SmartScan Stay Admin',
  description:
    'Преглед на получените запитвания от клиенти, AI Triaging (Gemini Flash) и директни отговори.',
  robots: {
    index: false,
    follow: false,
  },
};

const AdminContactsPage = async () => {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  const snapshot = await getAdminDashboardSnapshot(admin);

  return <AdminDashboardPage initialSnapshot={snapshot} defaultTab="contacts" />;
};

export default AdminContactsPage;
