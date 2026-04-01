'use client';

import { SiteConfigProvider } from '../src/context/SiteConfigContext';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteConfigProvider>
      <AuthProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </AuthProvider>
    </SiteConfigProvider>
  );
}
