'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BagIcon, ChevronRightIcon, HeartIcon, MenuIcon, SearchIcon, XIcon } from '@/components/ui/Icons';
import { getCartTotals, useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/track-order', label: 'Track Order' }
];

const MENU_LINKS = [...NAV_LINKS, { href: '/search', label: 'Search' }];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  const items = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.openCart);
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const { totalItems } = getCartTotals(items);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobilePanelRef.current?.querySelector('a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav aria-label="Main navigation" className={`${styles.nav} ${scrolled || mobileOpen ? styles.navScrolled : ''}`}>
        <div className={styles.inner}>
          <div className={styles.left}>
            <button
              aria-controls="mobile-navigation"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className={styles.menuButton}
              onClick={() => setMobileOpen((open) => !open)}
              ref={menuButtonRef}
              type="button"
            >
              <span className={`${styles.menuIcon} ${mobileOpen ? styles.menuIconOpen : ''}`}>
                <MenuIcon />
                <XIcon />
              </span>
            </button>

            <div className={styles.links}>
              {NAV_LINKS.map((link) => (
                <Link
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ''}`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <Link aria-label="REDOXDESIGNX home" className={styles.logo} href="/">
            <Image alt="" className={styles.logoImg} height={36} src="/icon1?brand=2" unoptimized width={36} />
            <span className={styles.logoText}>REDOXDESIGNX</span>
          </Link>

          <div className={styles.actions}>
            <Link aria-label="Search" className={`${styles.iconButton} ${styles.hideMobile}`} href="/search">
              <SearchIcon />
            </Link>
            <ThemeToggle />
            <Link aria-label={`Wishlist: ${wishlistCount} saved`} className={styles.iconButton} href="/account/wishlist">
              <HeartIcon />
              {wishlistCount > 0 && <span className={styles.count}>{wishlistCount}</span>}
            </Link>
            <button
              aria-label={`Cart: ${totalItems} items`}
              className={styles.iconButton}
              onClick={openCart}
              type="button"
            >
              <BagIcon />
              {totalItems > 0 && (
                <span className={styles.count} key={totalItems}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div
        aria-hidden="true"
        className={`${styles.mobileOverlay} ${mobileOpen ? styles.mobileOverlayOpen : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <div
        aria-hidden={!mobileOpen}
        className={`${styles.mobilePanel} ${mobileOpen ? styles.mobilePanelOpen : ''}`}
        id="mobile-navigation"
        inert={!mobileOpen}
        ref={mobilePanelRef}
      >
        <div className={styles.mobilePanelInner}>
          {MENU_LINKS.map((link, index) => (
            <Link
              className={`${styles.mobileLink} ${isActive(link.href) ? styles.mobileLinkActive : ''}`}
              href={link.href}
              key={link.href}
              style={{ transitionDelay: mobileOpen ? `${60 + index * 35}ms` : '0ms' }}
            >
              <span>{link.label}</span>
              <ChevronRightIcon className={styles.mobileLinkArrow} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
