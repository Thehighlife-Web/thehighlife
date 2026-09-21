/**
 * Correct ordering for the menu's four broken sorts. Used by
 * app/components/ProteusSortFix.tsx on Proteus's products response before the
 * JSCart widget renders it.
 *
 * Sort keys match what the customer sees on the product card (JSCart's
 * renderProductCard):
 *   price — customerPrice when the shopper has one, else salePrice, else price
 *   name  — the product name, case-insensitive, with numbers in number order
 *           ("2g" before "10g"), and leading/trailing spaces ignored
 *
 * Products with no usable price or name go last in either direction, so a data
 * gap never floats to the top of the list. Ties keep Proteus's order (Array
 * sort is stable).
 */

export type SortableProduct = {
  name?: string;
  price?: number | string;
  salePrice?: number | string;
  customerPrice?: number | string;
  hasCustomerPrice?: boolean;
};

/**
 * The sort keys JSCart sends. Its dropdown sends `price_asc` for "Price: Low to
 * High" (it used to send `price`, and still maps `price` to `price_asc`, so both
 * are here). Direction comes from the `_desc` suffix, so ONLY list keys whose
 * direction that rule gets right — an alias like "price_hightolow" would be
 * sorted the wrong way round.
 */
export const FIXED_SORTS = new Set(["price", "price_asc", "price_desc", "name", "name_desc"]);

function shownPrice(p: SortableProduct): number | null {
  const v = p.hasCustomerPrice && p.customerPrice ? p.customerPrice : p.salePrice || p.price;
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** Returns a NEW array in the right order; unknown sorts come back unchanged. */
export function sortProducts<T extends SortableProduct>(products: T[], sortby: string): T[] {
  if (!FIXED_SORTS.has(sortby)) return products;
  const dir = sortby.endsWith("_desc") ? -1 : 1;

  if (sortby.startsWith("price")) {
    return [...products].sort((a, b) => {
      const pa = shownPrice(a);
      const pb = shownPrice(b);
      if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
      return dir * (pa - pb);
    });
  }

  return [...products].sort((a, b) => {
    const na = (a.name ?? "").trim();
    const nb = (b.name ?? "").trim();
    if (!na || !nb) return na === nb ? 0 : !na ? 1 : -1;
    return dir * collator.compare(na, nb);
  });
}
