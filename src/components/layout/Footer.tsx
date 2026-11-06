import Image from 'next/image';
import Link from 'next/link';
import { InstallApp } from './InstallApp';
import styles from './Footer.module.css';

const LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/track-order', label: 'Track Order' },
  { href: '/size-guide', label: 'Size Guide' },
  { href: '/contact', label: 'Contact' }
];

const SOCIALS = [
  {
    href: 'https://wa.me/233558058348',
    label: 'WhatsApp',
    icon: (
      <path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.8l4.6-1.2A8.7 8.7 0 1 0 12 3.2Zm4.7 12.3c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.9.9-2.1c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" fill="currentColor" />
    )
  },
  {
    href: 'https://tiktok.com/@redoxdesignx',
    label: 'TikTok',
    icon: (
      <path d="M16.6 3h-3.2v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.3a6 6 0 1 0 5.1 5.9V9a7.4 7.4 0 0 0 4.2 1.3V7.1a4.2 4.2 0 0 1-4.2-4.1Z" fill="currentColor" />
    )
  },
  {
    href: 'https://instagram.com/redoxdesignx',
    label: 'Instagram',
    icon: (
      <>
        <rect height="16" rx="4.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="4" />
        <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.9" cy="7.1" fill="currentColor" r="1.1" />
      </>
    )
  }
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Recolours the logo's white strokes to ink in light mode; orange and transparency stay. */}
      <svg aria-hidden="true" className={styles.filterDefs} focusable="false">
        <filter colorInterpolationFilters="sRGB" id="redox-logo-ink">
          <feColorMatrix type="matrix" values="1 0 -0.93 0 0  0 1 -0.93 0 0  0 0 0.07 0 0  0 0 0 1 0" />
        </filter>
      </svg>

      <div className={styles.inner}>
        <div className={styles.top}>
          <Link aria-label="REDOXDESIGNX home" className={styles.logo} href="/">
            <Image alt="REDOXDESIGNX" height={73} src="/assets/icons/redoxlogo.png" width={116} />
          </Link>

          <nav aria-label="Footer" className={styles.links}>
            {LINKS.map((link) => (
              <Link className={styles.link} href={link.href} key={link.href}>{link.label}</Link>
            ))}
            <InstallApp />
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>&copy; 2026 REDOXDESIGNX &middot; Zero restocks</p>
          <div className={styles.socials}>
            {SOCIALS.map((social) => (
              <a aria-label={social.label} className={styles.social} href={social.href} key={social.label} rel="noopener noreferrer" target="_blank" title={social.label}>
                <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">{social.icon}</svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
