import { dealsOfTheDay, featuredDeal } from "@/data/site";

/**
 * The store's live coupon deals, straight from JSCart's public endpoint.
 *
 * This is the SAME data the shop widget shows — but fetched server-side so the
 * homepage can render deal artwork without loading the ~570KB JSCart bundle on a
 * page that has no shop on it. The endpoint is a plain unauthenticated GET (it's
 * what the widget itself calls on load), so there's no key here and nothing
 * sensitive to leak.
 *
 * `lib/proteus.ts` deliberately isn't the home for this: that module talks to the
 * key-protected webservices host and has to cache in-process because Proteus needs
 * POST. This is a GET on the public cart host, so Next's own fetch cache handles it.
 */
export type ShopDeal = {
  id: number | string;
  name?: string;
  /** Short badge text, e.g. "B1G1" or "25%". */
  displayText?: string;
  /** Longer line, e.g. "Felas BUY1 GET1". */
  message?: string;
  image?: string;
  slug?: string;
  hasProducts?: boolean;
};

const DEALS_URL = "https://cart.proteus420.com/highlife/api_cart_v2.cfm?action=deals";

/** Five minutes: deals change weekly, but a stale hero on launch day is worse. */
const REVALIDATE_SECONDS = 300;

/**
 * Returns only deals that actually have artwork — the homepage shows deals as
 * pictures, and a deal with none would be a blank box. Never throws: the homepage
 * must render even if Proteus is unreachable (callers hide the pictures on []).
 */
export async function getShopDeals(): Promise<ShopDeal[]> {
  try {
    const res = await fetch(DEALS_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const data = (await res.json()) as { success?: boolean; deals?: ShopDeal[] };
    if (!data?.success || !Array.isArray(data.deals)) return [];
    return data.deals.filter((d) => d && typeof d.image === "string" && d.image.trim() !== "");
  } catch {
    return [];
  }
}

/**
 * Deals this site KNOWS have ended: the featured pin once its endsAt passes, and
 * any deal-of-the-day strip entry (dealsOfTheDay) whose endsAt has passed.
 * Without this, a deal that ended but was left switched on in Proteus would keep
 * showing up on the homepage.
 */
function openDeals(deals: ShopDeal[], now: number): ShopDeal[] {
  const ended = new Set<number>();
  for (const d of dealsOfTheDay) {
    const coupon = d.href.match(/coupon=(\d+)/);
    if (coupon && new Date(d.endsAt).getTime() <= now) ended.add(Number(coupon[1]));
  }
  if (featuredDeal && new Date(featuredDeal.endsAt).getTime() <= now) ended.add(featuredDeal.coupon);
  return deals.filter((d) => Number.isFinite(Number(d.id)) && !ended.has(Number(d.id)));
}

/** Highest coupon id first. Proteus numbers deals in the order they're created. */
const newestFirst = (a: ShopDeal, b: ShopDeal) => Number(b.id) - Number(a.id);

/**
 * The one deal the homepage features, from deals that already have artwork
 * (getShopDeals), skipping any this site knows have ended (openDeals):
 *
 *   1. The deal pinned in data/site.ts (`featuredDeal`), until its endsAt — as
 *      long as Proteus still has it.
 *   2. Otherwise the NEWEST deal: the highest coupon id, so a deal uploaded today
 *      outranks last week's.
 *
 * Returns null when nothing qualifies — the band then shows no pictures.
 */
export function pickFeaturedDeal(deals: ShopDeal[], now: number = Date.now()): ShopDeal | null {
  const open = openDeals(deals, now);
  const pin = featuredDeal;
  if (pin) {
    const pinned = open.find((d) => Number(d.id) === pin.coupon);
    if (pinned) return pinned;
  }
  return [...open].sort(newestFirst)[0] ?? null;
}

/**
 * Every OTHER live deal with artwork, newest first — the small scrolling row
 * under the featured picture. Same skip rule as the featured deal.
 */
export function listOtherDeals(
  deals: ShopDeal[],
  featured: ShopDeal | null,
  now: number = Date.now(),
): ShopDeal[] {
  return openDeals(deals, now)
    .filter((d) => !featured || Number(d.id) !== Number(featured.id))
    .sort(newestFirst);
}
