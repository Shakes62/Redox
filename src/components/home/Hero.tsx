'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownIcon, ArrowUpRightIcon, WhatsappIcon } from '@/components/ui/Icons';
import { formatCurrency } from '@/lib/format';
import { whatsappLink } from '@/lib/product-display';
import styles from './Home.module.css';

export interface HeroLook {
  color: string;
  label: string;
  image: string;
  swatch: string;
  tint: string;
  ink: string;
}

export interface HeroProduct {
  slug: string;
  name: string;
  price: number;
  gsm: number | null;
}

interface HeroProps {
  product: HeroProduct | null;
  looks: HeroLook[];
}

const CYCLE_MS = 3200;
const FALLBACK_LOOK: HeroLook = { color: '', label: '', image: '', swatch: '#cc2131', tint: '#cc2131', ink: '#ffffff' };

/**
 * One shirt, every colour. The photo, the glow behind it and the highlight in
 * the headline all take the colour of the shirt on screen. It cycles on its
 * own until someone picks a colour, then it is theirs.
 */
export function Hero({ product, looks }: HeroProps) {
  const count = looks.length;
  const [active, setActive] = useState(0);
  // The photo on screen only changes once the next one has loaded, so a tap never flashes blank.
  const [shown, setShown] = useState(0);
  const [mounted, setMounted] = useState<number[]>(count > 1 ? [0, 1] : [0]);
  const [autoplay, setAutoplay] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(true);

  const sectionRef = useRef<HTMLElement>(null);
  const activeRef = useRef(0);
  const loadedRef = useRef<Set<number>>(new Set([0]));

  const select = (index: number) => {
    activeRef.current = index;
    setActive(index);
    const next = (index + 1) % Math.max(1, count);
    setMounted((current) => (current.includes(index) && current.includes(next) ? current : Array.from(new Set([...current, index, next]))));
    if (loadedRef.current.has(index)) setShown(index);
  };

  const handleLoad = (index: number) => {
    loadedRef.current.add(index);
    if (activeRef.current === index) setShown(index);
  };

  const pick = (index: number) => {
    setAutoplay(false);
    select(index);
  };

  // Pause while the hero is off screen.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || hovering || !visible || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => select((activeRef.current + 1) % count), CYCLE_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select only touches refs and setters
  }, [autoplay, hovering, visible, count]);

  const look = looks[active] ?? FALLBACK_LOOK;
  const productHref = product ? `/products/${product.slug}${look.color ? `?color=${encodeURIComponent(look.color)}` : ''}` : '/shop';
  const heroStyle = { '--tint': look.tint, '--tint-ink': look.ink } as CSSProperties;

  return (
    <section aria-label="Welcome" className={styles.hero} ref={sectionRef} style={heroStyle}>
      <div aria-hidden="true" className={styles.heroGlow} />

      <div className={styles.heroCopy}>
        <p className={styles.kicker}>
          <span aria-hidden="true" className={styles.kickerDot} />
          Blank apparel · Custom print
        </p>
        {/* Four short lines, poster style. The spaces between keep the heading readable aloud. */}
        <h1 className={styles.heroTitle}>
          <span className={styles.heroLine}>Wear it</span>{' '}
          <span className={styles.heroLine}>plain.</span>{' '}
          <span className={styles.heroLine}>Print it</span>{' '}
          <span className={styles.heroLine}>
            <mark className={styles.heroMark}>loud.</mark>
          </span>
        </h1>
        <p className={styles.heroLead}>Heavy cotton tees, raglans &amp; caps.</p>

        <div className={styles.heroCtas}>
          <a className={styles.ctaPrimary} href="#shop">
            Shop now <ArrowDownIcon className={styles.ctaArrowDown} size={18} />
          </a>
          <a
            className={styles.ctaGhost}
            href={whatsappLink('Hi REDOXDESIGNX, I want to print my design on some shirts.')}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WhatsappIcon className={styles.ctaWhatsapp} size={20} /> Print your design
          </a>
        </div>
      </div>

      <div
        className={styles.heroStageWrap}
        onPointerEnter={(event) => event.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        <Link aria-label={product ? `${product.name} in ${look.label}` : 'Shop all'} className={styles.stage} href={productHref}>
          <span className={styles.stageClip}>
            {looks.map((item, index) =>
              mounted.includes(index) ? (
                <Image
                  alt=""
                  className={`${styles.stageImage} ${index === shown ? styles.stageImageOn : ''}`}
                  fill
                  key={item.color || index}
                  loading={index === 0 ? undefined : 'eager'}
                  onLoad={() => handleLoad(index)}
                  preload={index === 0}
                  sizes="(min-width: 1100px) 560px, (min-width: 700px) 70vw, 92vw"
                  src={item.image}
                />
              ) : null
            )}
          </span>

          {product?.gsm ? (
            <span aria-hidden="true" className={styles.sticker}>
              <svg className={styles.stickerRing} viewBox="0 0 100 100">
                <defs>
                  <path d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" id="hero-ring" />
                </defs>
                <text>
                  <textPath href="#hero-ring" startOffset="0">
                    HEAVY COTTON · {product.gsm} GSM · HEAVY COTTON · {product.gsm} GSM ·
                  </textPath>
                </text>
              </svg>
              <span className={styles.stickerCore}>{product.gsm}</span>
            </span>
          ) : null}

          {product ? (
            <span className={styles.stagePill}>
              <strong>{formatCurrency(product.price)}</strong>
              <span>{look.label}</span>
              <span className={styles.stagePillArrow}>
                <ArrowUpRightIcon size={16} />
              </span>
            </span>
          ) : null}
        </Link>

        {count > 1 ? (
          <div aria-label="Pick a colour" className={styles.swatches} role="radiogroup">
            {looks.map((item, index) => (
              <button
                aria-checked={index === active}
                aria-label={item.label}
                className={`${styles.swatch} ${index === active ? styles.swatchOn : ''}`}
                key={item.color}
                onClick={() => pick(index)}
                role="radio"
                style={{ background: item.swatch }}
                title={item.label}
                type="button"
              />
            ))}
          </div>
        ) : null}
        {product ? <p className={styles.stageCaption}>{product.name}</p> : null}
      </div>
    </section>
  );
}
