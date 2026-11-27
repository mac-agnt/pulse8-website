import "server-only";
import { readShopPriceList } from "@/lib/content.server";
import { productPrice } from "@/lib/shop-pricing";
import type { Product } from "@/lib/shop";

/**
 * Shop products as they sell today: the catalogue in lib/shop.ts with the
 * prices staff set in /admin. Server pages call this and hand the priced
 * products (and the basket's price list) to the components.
 */
export async function shopCatalogue() {
  const list = await readShopPriceList();
  const priced = (product: Product): Product => ({ ...product, price: productPrice(product.slug, list) ?? product.price });
  return { list, priced };
}
