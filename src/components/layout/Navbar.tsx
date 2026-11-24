'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BagIcon, ChevronRightIcon, HeartIcon, MenuIcon, SearchIcon, WhatsappIcon, XIcon } from '@/components/ui/Icons';
import { whatsappLink } from '@/lib/product-display';
import { getCartTotals, useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/track-order', label: 'Track order' },
  { href: '/contact', label: 'Contact' }
];

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

  const mobileLinks = [
    ...NAV_LINKS,
    { href: '/search', label: 'Search' },
    { href: '/account/wishlist', label: wishlistCount > 0 ? `Saved · ${wishlistCount}` : 'Saved' }
  ];

  return (
    <>
      <nav aria-label="Main navigation" className={`${styles.nav} ${scrolled || mobileOpen ? styles.navScrolled : ''}`}>
        <div className={styles.bar}>
          <div className={styles.brand}>
            <Link aria-label="REDOXDESIGNX home" className={styles.logo} href="/">
              <Image alt="" className={styles.logoImg} height={42} src="/icon1?brand=2" unoptimized width={42} />
            </Link>
          </div>

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

          <div className={styles.actions}>
            <Link aria-label="Search" className={`${styles.iconButton} ${styles.desktopOnly}`} href="/search">
              <SearchIcon size={21} />
            </Link>
            <Link
              aria-label={`Saved: ${wishlistCount}`}
              className={`${styles.iconButton} ${styles.desktopOnly}`}
              href="/account/wishlist"
            >
              <HeartIcon size={21} weight={wishlistCount > 0 ? 'fill' : 'regular'} />
              {wishlistCount > 0 && <span className={styles.dot}>{wishlistCount}</span>}
            </Link>
            <ThemeToggle />
            <button
              aria-label={`Bag: ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
              className={styles.bagButton}
              onClick={openCart}
              type="button"
            >
              <BagIcon size={19} weight="bold" />
              <span className={styles.bagLabel}>Bag</span>
              <span className={`${styles.bagCount} ${totalItems > 0 ? styles.bagCountFull : ''}`} key={totalItems}>
                {totalItems}
              </span>
            </button>
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
                <MenuIcon size={24} />
                <XIcon size={24} />
              </span>
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
        {mobileLinks.map((link, index) => (
          <Link
            className={`${styles.mobileLink} ${isActive(link.href) ? styles.mobileLinkActive : ''}`}
            href={link.href}
            key={link.href}
            style={{ transitionDelay: mobileOpen ? `${50 + index * 30}ms` : '0ms' }}
          >
            <span>{link.label}</span>
            <ChevronRightIcon className={styles.mobileLinkArrow} />
          </Link>
        ))}
        <a
          className={styles.mobileWhatsapp}
          href={whatsappLink('Hi REDOXDESIGNX, I have a question.')}
          rel="noopener noreferrer"
          target="_blank"
        >
          <WhatsappIcon size={22} />
          Chat on WhatsApp
        </a>
      </div>
    </>
  );
}
