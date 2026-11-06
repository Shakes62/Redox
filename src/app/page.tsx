import { ProductCard } from '@/components/product/ProductCard';
import { getVisibleDbProducts } from '@/lib/catalog-db';
import styles from './pages.module.css';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await getVisibleDbProducts();

  return (
    <div className={styles.homePage}>
      <section className={styles.catalogSection} id="latest-products">
        {products.length > 0 ? (
          <div className={styles.landingGrid}>
            {products.map((product, index) => (
              <ProductCard key={product.id} priority={index === 0} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>Catalog</h2>
            <p>Add products in the admin panel to show them here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
