'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';
import styles from './ProductGallery.module.css';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  /** The first photo is the page's largest image: load it before anything else. */
  preloadFirst?: boolean;
}

/**
 * Swipe on phones (native scroll-snap, no gesture library), arrows and
 * thumbnails on desktop. The photo on screen and its neighbours load first.
 */
export function ProductGallery({ images, alt, preloadFirst = false }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // While we scroll the track ourselves, its scroll events are not the shopper's.
  const steeringUntil = useRef(0);
  const count = images.length;

  const goTo = (index: number) => {
    const next = (index + count) % count;
    setActive(next);
    const track = trackRef.current;
    if (!track) return;
    steeringUntil.current = Date.now() + 600;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: track.clientWidth * next, behavior: reduce ? 'auto' : 'smooth' });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || Date.now() < steeringUntil.current) return;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (index !== active) setActive(index);
  };

  if (count === 0) {
    return <div aria-hidden="true" className={`${styles.main} ${styles.empty}`} />;
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <div
          aria-label={`${alt}: ${count} ${count === 1 ? 'photo' : 'photos'}`}
          className={styles.track}
          onScroll={onScroll}
          ref={trackRef}
          role="region"
          tabIndex={0}
        >
          {images.map((src, index) => (
            <div className={styles.slide} key={src}>
              <Image
                alt={index === 0 ? alt : `${alt}, photo ${index + 1}`}
                className={styles.photo}
                fill
                loading={index === 0 && preloadFirst ? undefined : Math.abs(index - active) <= 1 ? 'eager' : 'lazy'}
                preload={index === 0 && preloadFirst}
                sizes="(min-width: 1240px) 640px, (min-width: 900px) 52vw, 100vw"
                src={src}
              />
            </div>
          ))}
        </div>

        {count > 1 ? (
          <>
            <button aria-label="Previous photo" className={`${styles.arrow} ${styles.arrowPrev}`} onClick={() => goTo(active - 1)} type="button">
              <ChevronLeftIcon />
            </button>
            <button aria-label="Next photo" className={`${styles.arrow} ${styles.arrowNext}`} onClick={() => goTo(active + 1)} type="button">
              <ChevronRightIcon />
            </button>
            <div aria-hidden="true" className={styles.dots}>
              {images.map((src, index) => (
                <span className={`${styles.dot} ${index === active ? styles.dotOn : ''}`} key={src} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div aria-label="Photos" className={styles.thumbs} role="group">
          {images.map((src, index) => (
            <button
              aria-label={`Photo ${index + 1}`}
              aria-pressed={index === active}
              className={`${styles.thumb} ${index === active ? styles.thumbOn : ''}`}
              key={src}
              onClick={() => goTo(index)}
              type="button"
            >
              <Image alt="" fill sizes="72px" src={src} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
