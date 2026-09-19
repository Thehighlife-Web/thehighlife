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
 * Returns only deals that actually have artwork — the homepage shows a deal as a
 * picture, and a deal with none would be a blank box. Never throws: the homepage
 * must render even if Proteus is unreachable (callers hide the picture on []).
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
 * The one deal the homepage features, from deals that already have artwork
 * (getShopDeals):
 *
 *   1. The deal pinned in data/site.ts (`featuredDeal`), until its endsAt — as
 *      long as Proteus still has it.
 *   2. Otherwise the NEWEST deal: the highest coupon id. Proteus numbers deals in
 *      the order they're created, so a deal uploaded today outranks last week's.
 *
 * Deals this site KNOWS have ended are skipped in both steps: the pin once its
 * endsAt passes, and any deal-of-the-day strip entry (dealsOfTheDay) whose
 * endsAt has passed. Without that, a deal that ended but was left switched on in
 * Proteus would come straight back as "newest".
 *
 * Returns null when nothing qualifies — the band then shows no picture.
 */
export function pickFeaturedDeal(deals: ShopDeal[], now: number = Date.now()): ShopDeal | null {
  const ended = new Set<number>();
  for (const d of dealsOfTheDay) {
    const coupon = d.href.match(/coupon=(\d+)/);
    if (coupon && new Date(d.endsAt).getTime() <= now) ended.add(Number(coupon[1]));
  }
  if (featuredDeal && new Date(featuredDeal.endsAt).getTime() <= now) ended.add(featuredDeal.coupon);

  const open = deals.filter((d) => !ended.has(Number(d.id)));

  const pin = featuredDeal;
  if (pin && !ended.has(pin.coupon)) {
    const pinned = open.find((d) => Number(d.id) === pin.coupon);
    if (pinned) return pinned;
  }

  let newest: ShopDeal | null = null;
  for (const d of open) {
    if (!Number.isFinite(Number(d.id))) continue;
    if (!newest || Number(d.id) > Number(newest.id)) newest = d;
  }
  return newest;
}
