import { Suspense } from 'react';
import { ResetPasswordClient } from './ResetPasswordClient';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main><div className="login-page"><div className="login-card"><div className="login-header"><h1>Loading...</h1></div></div></div></main>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
