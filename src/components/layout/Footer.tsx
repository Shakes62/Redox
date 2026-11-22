import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { InstagramIcon, MapPinIcon, TiktokIcon, WhatsappIcon } from '@/components/ui/Icons';
import { whatsappLink } from '@/lib/product-display';
import { InstallApp } from './InstallApp';
import styles from './Footer.module.css';

const LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/track-order', label: 'Track order' },
  { href: '/size-guide', label: 'Size guide' },
  { href: '/contact', label: 'Contact' }
];

const SOCIALS = [
  { href: 'https://tiktok.com/@redoxdesignx', label: 'TikTok', Icon: TiktokIcon },
  { href: 'https://instagram.com/redoxdesignx', label: 'Instagram', Icon: InstagramIcon }
];

const NAME = 'REDOXDESIGNX';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Image alt="" className={styles.mark} height={52} src="/icon1?brand=2" unoptimized width={52} />
            <p className={styles.tagline}>
              Blank apparel &amp; custom print.
              <span>
                <MapPinIcon size={15} weight="fill" /> Amasaman, Accra
              </span>
            </p>
          </div>

          <nav aria-label="Footer" className={styles.links}>
            {LINKS.map((link) => (
              <Link className={styles.link} href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
            <InstallApp />
          </nav>

          <div className={styles.contact}>
            <a className={styles.whatsapp} href={whatsappLink()} rel="noopener noreferrer" target="_blank">
              <WhatsappIcon size={20} />
              WhatsApp us
            </a>
            <div className={styles.socials}>
              {SOCIALS.map(({ href, label, Icon }) => (
                <a aria-label={label} className={styles.social} href={href} key={label} rel="noopener noreferrer" target="_blank" title={label}>
                  <Icon size={19} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* The name, wall to wall: the last thing anyone sees, and the one they remember. */}
        <div className={styles.signature}>
          <span className="srOnly">{NAME}</span>
          <p aria-hidden="true" className={styles.wordmark}>
            {NAME.split('').map((letter, index) => (
              <span
                className={index === NAME.length - 1 ? styles.wordmarkX : undefined}
                key={index}
                style={{ '--i': index } as CSSProperties}
              >
                {letter}
              </span>
            ))}
          </p>
        </div>

        <div className={styles.bottom}>
          <span>&copy; 2026 {NAME}. All rights reserved.</span>
          <span>MoMo · Card · Bank — secured by Paystack</span>
        </div>
      </div>
    </footer>
  );
}
