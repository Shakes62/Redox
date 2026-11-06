import { TrackOrder } from '@/components/commerce/TrackOrder';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
  title: 'Track Order',
  description: 'Trace your REDOXDESIGNX direct order shipping and delivery status live.',
  path: '/track-order'
});

export default function TrackOrderPage() {
  return (
    <div style={{ minHeight: '70vh', padding: 'calc(var(--nav-height) + clamp(40px, 8vw, 96px)) var(--section-x) 80px' }}>
      <TrackOrder />
    </div>
  );
}
