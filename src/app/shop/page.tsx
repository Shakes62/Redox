import { ShopGrid } from '@/components/commerce/ShopGrid';
import { getVisibleDbProducts } from '@/lib/catalog-db';
import { buildMetadata } from '@/lib/metadata';
import styles from '../pages.module.css';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Shop',
  description: 'Heavy cotton tees, raglans and caps from REDOXDESIGNX. Buy one or buy in bulk.',
  path: '/shop'
});

interface ShopPageProps {
  searchParams: Promise<{ kind?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [{ kind }, products] = await Promise.all([searchParams, getVisibleDbProducts()]);

  return (
    <div className={styles.storePage}>
      <ShopGrid initialKind={kind} products={products} syncUrl title="Shop" />
    </div>
  );
}
