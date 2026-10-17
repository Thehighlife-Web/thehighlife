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
  id?: number | string;
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

/**
 * Biggest saving first, in dollars (regular price minus the price on the card),
 * ties in name order. Used for the homepage's "On Sale Right Now" row, which has
 * always led with the biggest markdowns — Proteus has no such sort, so it's done
 * here (see ProteusSortFix). Items with no computable saving go last.
 *
 * ⚠️ NOT WIRED UP at the moment — the On Sale tab went to newest first on
 * 13 Oct 2026 (sortByNewest below). Kept because it works and is one line to
 * switch back to in ProteusSortFix.
 */
export function sortBySavings<T extends SortableProduct>(products: T[]): T[] {
  const saving = (p: T) => {
    const was = typeof p.price === "number" ? p.price : parseFloat(String(p.price ?? ""));
    const now = shownPrice(p);
    return Number.isFinite(was) && now !== null ? was - now : null;
  };
  return [...products].sort((a, b) => {
    const sa = saving(a);
    const sb = saving(b);
    if (sa === null || sb === null) return sa === sb ? 0 : sa === null ? 1 : -1;
    if (sb !== sa) return sb - sa;
    return collator.compare((a.name ?? "").trim(), (b.name ?? "").trim());
  });
}

/**
 * Newest first, for the homepage's "On Sale" tab.
 *
 * ⚠️ READ THIS BEFORE CHANGING IT. "Newest" here means the most recently added
 * PRODUCT, not the most recently discounted one. The products API returns no
 * dates whatsoever — no added date, no sale start, nothing — so when something
 * went on sale is simply not knowable from our side. An item that has sat on the
 * shelf for months and was marked down this morning will NOT come first.
 *
 * Proteus's own `sortby=newest` is exactly product id descending — checked
 * against the live on-sale list, all 107 positions matched — so ordering by id
 * here reproduces their "newest" without depending on their server, which gets
 * its own name and price sorts wrong (see FIXED_SORTS above).
 *
 * If a real "just went on sale" order is ever wanted, Proteus has to publish a
 * sale-start or last-updated field; there is no way to derive it from this.
 */
export function sortByNewest<T extends SortableProduct>(
  products: T[],
  /**
   * product id -> when we first saw it on sale (lib/saleSeen.ts). Optional: the
   * site keeps this note itself because Proteus has no sale date. With it, the
   * order is genuinely "most recently discounted". Without it — the note is
   * empty, the store is unreachable, or this isn't an on-sale list — it falls
   * back to product id, which is what the row did before.
   */
  firstSeen?: Record<string, string>,
): T[] {
  const idOf = (p: T) => {
    const n = typeof p.id === "number" ? p.id : parseFloat(String(p.id ?? ""));
    return Number.isFinite(n) ? n : null;
  };
  const seenAt = (p: T) => {
    const iso = firstSeen?.[String(p.id)];
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  };

  return [...products].sort((a, b) => {
    const sa = seenAt(a);
    const sb = seenAt(b);
    // Most recently marked down first. Anything we've never seen go on sale
    // sorts below everything we have — it's been there longer than our note.
    if (sa !== null || sb !== null) {
      if (sa === null) return 1;
      if (sb === null) return -1;
      if (sb !== sa) return sb - sa;
    }
    const ia = idOf(a);
    const ib = idOf(b);
    // Anything without a usable id goes last rather than floating to the top.
    if (ia === null || ib === null) return ia === ib ? 0 : ia === null ? 1 : -1;
    return ib - ia;
  });
}

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
