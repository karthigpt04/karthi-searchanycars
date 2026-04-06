import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordClient } from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main><div className="login-page"><div className="login-card"><div className="login-header"><h1>Loading...</h1></div></div></div></main>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
