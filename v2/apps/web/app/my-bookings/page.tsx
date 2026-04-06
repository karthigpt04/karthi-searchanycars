import type { Metadata } from 'next';
import BookingsClient from './BookingsClient';

export const metadata: Metadata = {
  title: 'My Bookings',
  robots: { index: false, follow: false },
};

export default function MyBookingsPage() {
  return <BookingsClient />;
}
