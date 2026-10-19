import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthenticatedAdmin } from '@/lib/auth/adminDal';
import { AdminLoginCard } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Вход в Админ Панела | SmartScan Stay',
  description:
    'Защитен вход за собственика и администратора на платформата SmartScan Stay.',
  robots: {
    index: false,
    follow: false,
  },
};

const AdminLoginPage = async () => {
  const admin = await getAuthenticatedAdmin();

  if (admin) {
    redirect('/admin');
  }

  const isTestLoginEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_TEST_ADMIN_LOGIN === 'true';

  return <AdminLoginCard isTestLoginEnabled={isTestLoginEnabled} />;
};

export default AdminLoginPage;
