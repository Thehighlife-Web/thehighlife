/**
 * Products currently marked down, straight from JSCart's public products endpoint.
 *
 * Same shape of thing as lib/deals.ts — and deliberately so. That one returns
 * COUPON artwork ("B1G1", "25% off"); this returns actual PRODUCTS with real
 * prices ("$150 → $100"). Both are unauthenticated GETs on the public cart host,
 * so neither needs a key and neither drags the ~570KB JSCart bundle onto a page
 * that has no shop on it.
 */
export type OnSaleProduct = {
  id: number | string;
  name: string;
  brand?: string;
  /** Regular price, struck through in the UI. */
  price: number;
  /** What they actually pay. Always less than `price` — see the filter below. */
  salePrice: number;
  imageUrl?: string;
  slug?: string;
  /** price - salePrice, precomputed so the UI doesn't repeat the arithmetic. */
  saved: number;
};

const ON_SALE_URL =
  "https://cart.proteus420.com/highlife/api_cart_v2.cfm?action=products&onsale=1&sortby=newest&pageSize=200";

/** Matches lib/deals.ts — close to the register without hammering Proteus. */
const REVALIDATE_SECONDS = 300;

/**
 * A rail is skimmed, not exhausted. The store has ~93 items on sale; rendering
 * every one would mean 93 product images on the homepage for a row most people
 * scroll a few cards into. "View all on sale" covers the rest.
 */
const MAX_ITEMS = 24;

type RawProduct = {
  id?: number | string;
  name?: string;
  brand?: string;
  price?: number | string;
  salePrice?: number | string;
  imageUrl?: string;
  slug?: string;
  inStock?: number | boolean;
  thc?: number | string;
  cbd?: number | string;
};

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * In-stock, genuinely-discounted products, most expensive first.
 * Never throws: the homepage must render even if Proteus is unreachable, and
 * callers hide the rail on an empty array.
 */
/**
 * Rotates through the brands so the rail reads as a genuine mix.
 *
 * The feed arrives clustered — 15 Jeeter, 9 Ruby's, 8 Cannaboss and so on — so
 * taking it in order shows one brand over and over. This groups by brand and then
 * takes one from each in turn, so with 19 brands available the first 19 cards are
 * 19 different brands before any repeats.
 *
 * (Proteus has no usable category field on this feed and its sortby=newest isn't
 * chronological, so brand is the only trustworthy axis to vary on.)
 */
function rotateBrands<T extends { brand?: string }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = (item.brand || "").trim().toLowerCase();
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const queues = [...groups.values()];
  const out: T[] = [];
  let placed = true;
  while (placed) {
    placed = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        placed = true;
      }
    }
  }
  return out;
}

export async function getOnSaleProducts(): Promise<OnSaleProduct[]> {
  try {
    const res = await fetch(ON_SALE_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const data = (await res.json()) as { success?: boolean; products?: RawProduct[] };
    if (!data?.success || !Array.isArray(data.products)) return [];

    const cleaned = data.products
      .map((p) => {
        const price = toNum(p.price);
        const salePrice = toNum(p.salePrice);
        return {
          id: p.id ?? "",
          name: typeof p.name === "string" ? p.name : "",
          brand: p.brand || undefined,
          price,
          salePrice,
          imageUrl: p.imageUrl || undefined,
          slug: p.slug || undefined,
          saved: price - salePrice,
          inStock: p.inStock === true || toNum(p.inStock) > 0,
          // Cannabis products always carry a potency figure; accessories and pet
          // treats come back with both at zero. This is the only reliable signal —
          // the feed has no category, and matching on names is worse than useless
          // here ("Strawberry" contains "raw").
          isCannabis: toNum(p.thc) > 0 || toNum(p.cbd) > 0,
        };
      })
      // Don't advertise something that isn't on the shelf, and guard against a
      // feed where salePrice equals (or exceeds) price — that isn't a markdown.
      .filter(
        (p) => p.inStock && p.isCannabis && p.name && p.price > 0 && p.salePrice > 0 && p.saved > 0,
      )
      .map(({ inStock: _inStock, isCannabis: _isCannabis, ...p }) => p);

    // Biggest saving first, THEN rotate brands. Rotation keeps each brand's queue in
    // order, so this makes every brand lead with its strongest markdown — and the
    // rail as a whole opens with the best deal in the store rather than whatever
    // happened to come back first.
    const byBestDeal = [...cleaned].sort((a, b) => b.saved - a.saved);
    return rotateBrands(byBestDeal).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}
