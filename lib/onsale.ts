import { saleShelfTabs } from "@/data/site";
import { getSaleSeen } from "@/lib/saleSeen";
import { sortByNewest } from "@/lib/sortProducts";

/**
 * The homepage's On Sale shelf: what's discounted right now, by category, with
 * the percent off and the price they'll pay.
 *
 * Built here, on the server, from JSCart's public cart endpoints — not by
 * steering the JSCart widget, which is what the row used to embed. The widget
 * can't do it: showOnSale() clears the category and filterByCategory() clears
 * on-sale, and the server ignores `onsale=1` whenever `cat=` is present (checked:
 * cat=8&onsale=1 returns the whole Flower category). So this fetches each
 * category once and keeps only the ids that are genuinely discounted.
 *
 * ── WHAT COUNTS AS "ON SALE" ─────────────────────────────────────────────────
 * Proteus's own on-sale list mixes three things (Nov 2026: 286 items):
 *
 *   • a PRICE CUT set on the SKU (onSale + salePrice < price) — 89 items
 *   • a PERCENT-OFF coupon on the item ("30% off all Find") — 93 items
 *   • a buy-one-get-one coupon and nothing else — 104 items
 *
 * Elijah asked for items with a percent off and a discounted price, so the first
 * two are in and BOGO is out: it has no single price to show.
 *
 * A price cut WINS over a coupon on the same item — the same honesty rule as
 * components/ProteusCouponPrice.tsx. Coupon prices are flagged `atCheckout`,
 * because Proteus's cart still shows the shelf price until checkout applies the
 * coupon (its validate_cart reprices a coupon item back to full).
 *
 * Never throws: the homepage has to render if Proteus is unreachable, and the
 * section simply disappears on an empty result.
 */

export type SaleItem = {
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  /** Shelf price, struck through. */
  was: number;
  /** What they pay. Always less than `was`. */
  now: number;
  /** Whole-number percent off, for the badge. Never 0. */
  pct: number;
  /** A coupon saving Proteus applies at checkout — the cart shows `was` until then. */
  atCheckout: boolean;
  /**
   * The price handed to ProteusWidget.add() — JSCart's own rule for its Add button
   * (`salePrice || price`). So a price cut goes in at the sale price, and a coupon
   * item at shelf price, with checkout taking the coupon off. Same as on /menu.
   */
  cartPrice: number;
  /** Units on the shelf, so Add can stop where JSCart's own button would. 0 = unknown. */
  inventory: number;
};

export type SaleTab = { label: string; cat: number; items: SaleItem[] };

export type SaleShelf = {
  /** Everything on sale, newest markdown first. */
  all: SaleItem[];
  /** One per category in saleShelfTabs that has anything on sale; empty ones are dropped. */
  tabs: SaleTab[];
};

const EMPTY: SaleShelf = { all: [], tabs: [] };

const API = "https://cart.proteus420.com/highlife/api_cart_v2.cfm";
const ACCOUNT = "accountId=1204&locationId=1";

/** Matches lib/deals.ts — close to the register without hammering Proteus. */
const REVALIDATE_SECONDS = 300;

/**
 * A rail is skimmed, not exhausted — each tab shows this many and the "View all"
 * link covers the rest. 24 images per tab is already plenty for a row most people
 * scroll a few cards into.
 */
const MAX_PER_TAB = 24;

/**
 * Proteus returns a whole category in one page today (count === rows, largest is
 * Pre-Rolls at 379 rows / 541KB). Page anyway in case that changes — but bounded,
 * so a misbehaving count can't turn one homepage render into dozens of requests.
 * Every response must stay under Next's 2MB fetch-cache limit to be cached at all,
 * which is why the page size isn't simply raised instead.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 4;

/**
 * The sale-date note is a nicety; the shelf must not wait on it. getSaleSeen()
 * bounds its own blob read and Proteus fetch, but together those could still add
 * seconds to a homepage render, so it gets one overall limit here and the shelf
 * falls back to product-id order if it misses.
 */
const SALE_SEEN_BUDGET_MS = 1500;

type RawCoupon = { id?: number | string };

type RawProduct = {
  id?: number | string;
  name?: string;
  brand?: string;
  price?: number | string;
  salePrice?: number | string;
  onSale?: boolean;
  hasCustomerPrice?: boolean;
  inventory?: number | string;
  /** Sold by size only — the widget shows "View Options" instead of a price. */
  subsOnly?: boolean | number | string;
  coupons?: RawCoupon[];
  imageUrl?: string;
  inStock?: number | boolean;
  thc?: number | string;
  cbd?: number | string;
};

type ProductsResponse = { success?: boolean; count?: number | string; products?: RawProduct[] };

type RawDeal = { id?: number | string; type?: string; amount?: number | string };

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const truthy = (v: unknown) => v === true || toNum(v) > 0 || v === "true";

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Every product in a products query, following pages if Proteus ever splits them. */
async function getAllProducts(query: string): Promise<RawProduct[] | null> {
  const out: RawProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await getJson<ProductsResponse>(
      `${API}?action=products&${query}&${ACCOUNT}&page=${page}&limit=${PAGE_SIZE}`,
    );
    if (!data?.success || !Array.isArray(data.products)) return page === 1 ? null : out;
    out.push(...data.products);
    const total = toNum(data.count);
    if (data.products.length === 0 || !total || out.length >= total) break;
  }
  return out;
}

/** deal id -> percent off, for percent-type deals only. */
async function getPercentDeals(): Promise<Map<string, number>> {
  const data = await getJson<RawDeal[] | { deals?: RawDeal[] }>(`${API}?action=deals&${ACCOUNT}`);
  const list = Array.isArray(data) ? data : Array.isArray(data?.deals) ? data.deals : [];
  const out = new Map<string, number>();
  for (const d of list) {
    const pct = toNum(d.amount);
    // Same bounds as ProteusCouponPrice: a 0% or 100%+ "discount" is a data error.
    if (d.type === "percent" && d.id != null && pct > 0 && pct < 100) out.set(String(d.id), pct);
  }
  return out;
}

/** The item's real saving, or null if it has none we can honestly show as a price. */
function toSaleItem(p: RawProduct, percentDeals: Map<string, number>): SaleItem | null {
  const name = typeof p.name === "string" ? p.name.trim() : "";
  const was = toNum(p.price);
  const inStock = p.inStock === true || toNum(p.inStock) > 0;
  // Cannabis products always carry a potency figure; accessories come back with
  // both at zero. The feed's category is blank, so this is the reliable signal.
  const isCannabis = toNum(p.thc) > 0 || toNum(p.cbd) > 0;
  // A size-only product's `price` is a base unit price, not what anyone pays.
  if (!name || was <= 0 || !inStock || !isCannabis || truthy(p.subsOnly) || p.id == null) return null;
  // Member pricing: we can't know which price that customer sees, and JSCart's Add
  // would put the member price in the cart — not the one on our card. Leave it out.
  if (p.hasCustomerPrice) return null;

  const base = {
    id: String(p.id),
    name,
    brand: p.brand?.trim() || undefined,
    imageUrl: p.imageUrl || undefined,
    was,
    inventory: Math.max(0, Math.floor(toNum(p.inventory))),
  };

  // 1. A price cut on the SKU — what the cart will actually charge.
  const sale = toNum(p.salePrice);
  if (p.onSale && sale > 0 && sale < was) {
    const pct = Math.round((1 - sale / was) * 100);
    return pct >= 1 ? { ...base, now: sale, pct, atCheckout: false, cartPrice: sale } : null;
  }

  // 2. A percent coupon, applied at checkout — so it goes in the cart at shelf price.
  const pcts = (p.coupons ?? [])
    .map((c) => percentDeals.get(String(c.id)))
    .filter((n): n is number => n != null);
  if (!pcts.length) return null;
  const pct = Math.max(...pcts);
  const now = Math.round(was * (1 - pct / 100) * 100) / 100;
  return now > 0 && now < was
    ? { ...base, now, pct: Math.round(pct), atCheckout: true, cartPrice: was }
    : null;
}

/** Resolves to `fallback` if the promise hasn't settled in time. */
function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export async function getSaleShelf(): Promise<SaleShelf> {
  try {
    // Everything at once: the sale list, the percent deals, every category, and
    // the sale-date note. They're independent, and serially this would be nine
    // round trips on a cold cache.
    const [onSale, percentDeals, seen, ...categories] = await Promise.all([
      getAllProducts("onsale=1"),
      getPercentDeals(),
      within(getSaleSeen(), SALE_SEEN_BUDGET_MS, { firstSeen: {}, updatedAt: null }),
      ...saleShelfTabs.map((t) => getAllProducts(`cat=${t.cat}`)),
    ]);
    if (!onSale) return EMPTY;

    const items = new Map<string, SaleItem>();
    for (const p of onSale) {
      const item = toSaleItem(p, percentDeals);
      if (item) items.set(item.id, item);
    }
    if (!items.size) return EMPTY;

    // Most recently marked down first (lib/saleSeen keeps that note, because
    // Proteus has no sale dates); falls back to product id when the note is empty.
    const all = sortByNewest([...items.values()], seen.firstSeen);

    const tabs: SaleTab[] = [];
    saleShelfTabs.forEach((t, i) => {
      const ids = new Set((categories[i] ?? []).map((p) => String(p.id)));
      // Filtering the already-sorted list keeps every tab in the same order.
      const inCat = all.filter((item) => ids.has(item.id));
      if (inCat.length) tabs.push({ ...t, items: inCat.slice(0, MAX_PER_TAB) });
    });

    return { all: all.slice(0, MAX_PER_TAB), tabs };
  } catch {
    return EMPTY;
  }
}
