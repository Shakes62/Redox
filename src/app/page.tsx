import { ShopGrid } from '@/components/commerce/ShopGrid';
import { Hero, type HeroLook, type HeroProduct } from '@/components/home/Hero';
import { PrintBand, type PrintShot } from '@/components/home/PrintBand';
import { Steps } from '@/components/home/Steps';
import { TypeTiles, type TypeTile } from '@/components/home/TypeTiles';
import { WeightScale, type WeightItem } from '@/components/home/WeightScale';
import { getVisibleDbProducts } from '@/lib/catalog-db';
import { MAX_HERO_LOOKS, pickHeroProduct, stockedColors } from '@/lib/hero-product';
import { getProductStockSummary } from '@/lib/inventory';
import {
  KIND_LABELS,
  kindsIn,
  colorImage,
  colorTones,
  colorsWithPhotos,
  coverImage,
  displayColorName,
  displayProductName,
  inkOn,
  productGsm,
  productKind,
  swatchBackground
} from '@/lib/product-display';
import { getWholesaleRule } from '@/lib/wholesale';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

function heroLooks(product: Product | null): HeroLook[] {
  if (!product) return [];
  const stocked = stockedColors(product);
  return toLooks(product, stocked.length >= 2 ? stocked : colorsWithPhotos(product));
}

function toLooks(product: Product, colors: string[]): HeroLook[] {
  return colors
    .slice(0, MAX_HERO_LOOKS)
    .map((color) => {
      const tint = colorTones(color, product.colorHex?.[color])[0] || '#cc2131';
      return {
        color,
        label: displayColorName(color),
        image: colorImage(product, color),
        swatch: swatchBackground(color, product.colorHex?.[color]),
        tint,
        ink: inkOn(tint)
      };
    });
}

/**
 * One tile per type of piece. The photo is a single garment (a colour shot)
 * from a piece still on sale, so the tile shows the thing, not a crowd.
 */
function typeTiles(products: Product[]): TypeTile[] {
  return kindsIn(products).map((kind) => {
    const ofKind = products.filter((product) => productKind(product) === kind);
    const onSale = ofKind.filter((product) => !getProductStockSummary(product).isSoldOut);
    const showcase = [...onSale, ...ofKind].find((product) => stockedColors(product).length > 0)
      || [...onSale, ...ofKind].find((product) => colorsWithPhotos(product).length > 0)
      || ofKind[0];
    const color = stockedColors(showcase)[0] || colorsWithPhotos(showcase)[0];
    return {
      kind,
      label: KIND_LABELS[kind].many,
      count: ofKind.length,
      fromPrice: onSale.length ? Math.min(...onSale.map((product) => product.price)) : null,
      image: color ? colorImage(showcase, color) : coverImage(showcase)
    };
  });
}

/** Shirts in order of fabric weight; caps and anything without a weight sit this one out. */
function weightItems(products: Product[]): WeightItem[] {
  return products
    .flatMap((product) => {
      const gsm = productGsm(product);
      const kind = productKind(product);
      if (!gsm || kind === 'caps') return [];
      return [{
        slug: product.slug,
        name: displayProductName(product.name),
        kind: KIND_LABELS[kind].one,
        gsm,
        price: product.price,
        image: coverImage(product)
      }];
    })
    .sort((a, b) => a.gsm - b.gsm || a.price - b.price);
}

/** Three shirts for the print card: dark, light and a colour, when the hero shirt has them. */
function printShots(looks: HeroLook[]): PrintShot[] {
  if (looks.length < 3) return [];
  const byName = (pattern: RegExp) => looks.find((look) => pattern.test(look.color));
  const dark = byName(/^black$/i) || looks[0];
  const light = byName(/^white$/i) || byName(/cream/i) || looks[1];
  const colour = looks.find((look) => look !== dark && look !== light && !/black|white|grey|gray|cream/i.test(look.color))
    || looks.find((look) => look !== dark && look !== light)!;
  return [dark, colour, light].map((look) => ({ image: look.image }));
}

export default async function HomePage() {
  // Already in the admin's shop order, so everything below follows it.
  const products = await getVisibleDbProducts();
  const featured = pickHeroProduct(products);
  const looks = heroLooks(featured);
  const heroProduct: HeroProduct | null = featured
    ? { slug: featured.slug, name: displayProductName(featured.name), price: featured.price, gsm: productGsm(featured) }
    : null;
  const bulkMins = products.map((product) => getWholesaleRule(product)?.minQuantity).filter((min): min is number => Boolean(min));

  return (
    <>
      <Hero looks={looks} product={heroProduct} />
      <TypeTiles tiles={typeTiles(products)} />
      <Steps bulkMin={bulkMins.length ? Math.min(...bulkMins) : null} />
      <WeightScale items={weightItems(products)} />
      <ShopGrid id="shop" products={products} />
      {/* Decorative, so any colour photo will do — sold out or not. */}
      <PrintBand shots={featured ? printShots(toLooks(featured, colorsWithPhotos(featured))) : []} />
    </>
  );
}
