'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';

/**
 * Loads the saved bag and wishlist once the page is interactive. Doing it here,
 * rather than as the stores are created, keeps the first browser render
 * identical to the server's HTML, so React never has to throw it away.
 */
export function StoreHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
    void useWishlistStore.persist.rehydrate();
  }, []);
  return null;
}
