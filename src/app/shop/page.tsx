import { ProductCard } from '@/components/product/ProductCard';
import { getVisibleDbProducts } from '@/lib/catalog-db';
import { buildMetadata } from '@/lib/metadata';
import styles from '../pages.module.css';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Shop',
  description: 'Shop limited-run REDOXDESIGNX hoodies, tees, cargos, outerwear, and accessories.',
  path: '/shop'
});

export default async function ShopPage() {
  const products = await getVisibleDbProducts();

  return (
    <div className={styles.homePage}>
      <section className={styles.catalogSection}>
        {products.length > 0 ? (
          <div className={styles.landingGrid}>
            {products.map((product, index) => (
              <ProductCard key={product.id} priority={index === 0} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No products available yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
