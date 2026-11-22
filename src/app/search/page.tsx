import { ShopGrid } from '@/components/commerce/ShopGrid';
import { SearchIcon } from '@/components/ui/Icons';
import { getVisibleDbProducts } from '@/lib/catalog-db';
import { buildMetadata } from '@/lib/metadata';
import styles from '../pages.module.css';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Search',
  description: 'Search REDOXDESIGNX tees, raglans and caps.',
  path: '/search'
});

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [{ q }, products] = await Promise.all([searchParams, getVisibleDbProducts()]);
  const query = (q || '').trim();

  return (
    <div className={styles.storePage}>
      <form action="/search" className={styles.searchBar} role="search">
        <SearchIcon aria-hidden="true" className={styles.searchIcon} />
        <input
          aria-label="Search"
          autoComplete="off"
          // Focus lands here when someone taps Search; it is the only thing on the page to do.
          autoFocus={!query}
          defaultValue={query}
          enterKeyHint="search"
          name="q"
          placeholder="Try 300 GSM, raglan, black…"
          type="search"
        />
        <button type="submit">Search</button>
      </form>
      <ShopGrid products={products} searchQuery={query} title={query ? `“${query}”` : 'Everything'} />
    </div>
  );
}
