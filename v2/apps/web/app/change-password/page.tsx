import type { Metadata } from 'next';
import ChangePasswordClient from './ChangePasswordClient';

export const metadata: Metadata = {
  title: 'Change Password',
  robots: { index: false, follow: false },
};

export default function ChangePasswordPage() {
  return <ChangePasswordClient />;
}
