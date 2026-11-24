import type { Product } from '@/types/product';
import { getProductStockSummary, isVariantInStock } from '@/lib/inventory';
import { colorsWithPhotos, productKind } from '@/lib/product-display';

/** The hero shows at most this many colours of its shirt. */
export const MAX_HERO_LOOKS = 8;

/** Colours with their own photo and at least one size left: the ones worth sending people to. */
export function stockedColors(product: Product): string[] {
  return colorsWithPhotos(product).filter((color) =>
    (product.variants || []).some((variant) => variant.color === color && isVariantInStock(variant))
  );
}

/**
 * Which product leads the homepage.
 *
 * The admin decides: it is the first product in the shop order that can fill
 * the hero — at least two colour photos with stock (caps need three, since a
 * tee says "apparel" faster). If nothing qualifies on stocked colours, the first
 * product with enough colour photos at all leads instead.
 *
 * Shared by the homepage and the admin panel, so the "Homepage hero" tag in the
 * admin always names the product the site actually shows.
 */
export function pickHeroProduct(products: Product[]): Product | null {
  const leads = (colorsOf: (product: Product) => string[]) =>
    products.find((product) => {
      if (getProductStockSummary(product).isSoldOut) return false;
      const needed = productKind(product) === 'caps' ? 3 : 2;
      return colorsOf(product).length >= needed;
    }) || null;

  return leads(stockedColors) || leads(colorsWithPhotos);
}
