'use client';

import type { ReactNode } from 'react';
import { AdminGuard } from '../../src/components/AdminGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
