'use client';

import { useParams } from 'next/navigation';
import { AdminCarForm } from '../../../../../src/components/AdminCarForm';

export default function AdminCarEditPage() {
  const params = useParams();
  const id = Number(params.id);

  if (!id || !Number.isFinite(id)) {
    return (
      <main className="adm">
        <div className="adm-header">
          <div className="container"><h1 className="adm-title">Invalid listing ID</h1></div>
        </div>
      </main>
    );
  }

  return <AdminCarForm listingId={id} />;
}
