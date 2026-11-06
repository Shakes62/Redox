'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product, Variant, WholesaleRule } from '@/types/product';
import { calcOrderTotal, calcServiceCharge, clamp, FREE_SHIPPING_THRESHOLD } from '@/lib/format';
import { getVariantStockLimit, UNTRACKED_STOCK_LIMIT } from '@/lib/inventory';
import {
  basketWholesaleSaving,
  effectiveUnitPrice,
  quantityByProduct
} from '@/lib/wholesale';

export interface CartItem {
  productId: string;
  productSlug: string;
  name: string;
  image: string;
  /** The normal price, captured when the piece was added. */
  price: number;
  variantId: string;
  size: string;
  color: string;
  sku: string;
  quantity: number;
  stockLimit?: number;
  /**
   * The product's bulk rule, captured alongside the price. A rule the merchant
   * changes afterwards will not reach an already-open bag until checkout, where
   * the server re-prices from the catalogue — the same way `price` already works.
   */
  wholesale?: WholesaleRule | null;
}

/** Which screen the drawer shows when it opens. */
export type DrawerView = 'bag' | 'checkout';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  view: DrawerView;
  /**
   * Pieces bought straight from a product page with "Buy now". They skip the
   * bag entirely, so whatever else the customer has saved there is untouched.
   */
  buyNowItems: CartItem[] | null;
  /** Bumped when a Buy-now order completes, so the product page can reset. */
  buyNowCompletedAt: number;
  addItem: (product: Product, variant: Variant, quantity?: number, selectedColorImage?: string) => void;
  /** Adds several lines and opens the bag once. */
  addItems: (lines: CartItem[]) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  openCheckout: () => void;
  buyNow: (lines: CartItem[]) => void;
  completeBuyNow: () => void;
  setView: (view: DrawerView) => void;
  closeCart: () => void;
  setHydrated: (hydrated: boolean) => void;
}

/** The one place a product + variant becomes a bag line. */
export function toCartItem(product: Product, variant: Variant, quantity = 1, selectedColorImage?: string): CartItem {
  const stockLimit = getVariantStockLimit(variant);
  return {
    productId: product.id,
    productSlug: product.slug,
    name: product.name,
    image: selectedColorImage || product.image,
    price: product.price,
    variantId: `${variant.id}-${variant.color}`,
    size: variant.size,
    color: variant.color,
    sku: variant.sku,
    quantity: clamp(quantity, 1, stockLimit),
    stockLimit,
    wholesale: product.wholesale ?? null
  };
}

function mergeInto(items: CartItem[], line: CartItem): CartItem[] {
  const existing = items.find((item) => item.variantId === line.variantId);
  if (!existing) return [...items, line];
  const limit = line.stockLimit || existing.stockLimit || UNTRACKED_STOCK_LIMIT;
  return items.map((item) =>
    item.variantId === line.variantId
      ? { ...item, ...line, quantity: clamp(item.quantity + line.quantity, 1, limit) }
      : item
  );
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      view: 'bag',
      buyNowItems: null,
      buyNowCompletedAt: 0,
      addItem: (product, variant, quantity = 1, selectedColorImage) =>
        set((state) => ({
          isOpen: true,
          view: 'bag',
          buyNowItems: null,
          items: mergeInto(state.items, toCartItem(product, variant, quantity, selectedColorImage))
        })),
      addItems: (lines) =>
        set((state) => ({
          isOpen: true,
          view: 'bag',
          buyNowItems: null,
          items: lines.reduce(mergeInto, state.items)
        })),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((item) => item.variantId !== variantId) })),
      updateQty: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: clamp(quantity, 1, item.stockLimit || UNTRACKED_STOCK_LIMIT) }
              : item
          )
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true, view: 'bag', buyNowItems: null }),
      openCheckout: () => set({ isOpen: true, view: 'checkout', buyNowItems: null }),
      buyNow: (lines) => set({ isOpen: true, view: 'checkout', buyNowItems: lines }),
      completeBuyNow: () => set({ buyNowCompletedAt: Date.now() }),
      setView: (view) => set({ view }),
      closeCart: () => set({ isOpen: false }),
      setHydrated: (hydrated) => set({ hydrated })
    }),
    {
      name: 'redox-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // Loaded after the first render (see StoreHydration) so the server HTML
      // and the browser's first paint always agree.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);

export function getCartTotals(items: CartItem[]) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Bulk pricing is per product across its sizes and colours, so the quantities
  // have to be totalled before anything is priced.
  const quantities = quantityByProduct(items);

  const subtotal =
    Math.round(
      items.reduce(
        (sum, item) =>
          sum + effectiveUnitPrice(item, quantities.get(item.productSlug) || 0) * item.quantity,
        0
      ) * 100
    ) / 100;

  const serviceCharge = calcServiceCharge(subtotal);
  const orderTotal = calcOrderTotal(subtotal);
  const freeShippingProgress = clamp((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 0, 100);
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

  return {
    totalItems,
    subtotal,
    serviceCharge,
    orderTotal,
    freeShippingProgress,
    remainingForFreeShipping,
    /** What bulk pricing is taking off this bag right now. */
    wholesaleSaving: basketWholesaleSaving(items),
    /** Per-product totals, so the drawer can show which lines qualified. */
    quantityByProductSlug: quantities
  };
}
