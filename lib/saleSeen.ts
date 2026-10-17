import { getStore } from "@netlify/blobs";

/**
 * Remembers WHEN each product first turned up on sale, because Proteus won't
 * tell us.
 *
 * Their API carries no dates at all — not on the product list, not on the
 * single-product endpoint, not on the deals feed. So "newest on sale" could
 * only ever mean "newest product that happens to be on sale", and an older item
 * discounted this morning stayed buried. The only way to know a markdown is new
 * is to have seen the shelf before it happened.
 *
 * So the site keeps its own note: a small map of product id -> the first moment
 * we saw it on sale. It's a Netlify blob, which this site already has by virtue
 * of running there — no database, no new service.
 *
 * ⚠️ IT ONLY KNOWS WHAT IT HAS WATCHED. On the first run everything currently
 * on sale is recorded at the same instant, so until the next markdown happens
 * the order falls back to product id. It gets more useful every day, and it
 * cannot be backfilled — there is nothing to backfill it from.
 *
 * ⚠️ IT MUST NEVER BREAK THE MENU. Every path here is wrapped: if the store is
 * unreachable, the credentials aren't there, or Proteus is down, this returns an
 * empty map and the shop falls back to ordering by product id, exactly as
 * before. A missing sale date is a cosmetic loss; a broken menu is not.
 */

const STORE = "onsale-seen";
const KEY = "first-seen";

/** How stale the note may get before a request refreshes it. */
const MAX_AGE_MS = 10 * 60 * 1000;

const ON_SALE_URL =
  "https://cart.proteus420.com/highlife/api_cart_v2.cfm" +
  "?action=products&onsale=1&accountId=1204&locationId=1&page=1&limit=400";

export type SaleSeen = {
  /** product id -> ISO timestamp we first saw it on sale */
  firstSeen: Record<string, string>;
  updatedAt: string | null;
};

const EMPTY: SaleSeen = { firstSeen: {}, updatedAt: null };

function store() {
  // Throws when the blob credentials aren't present (local `next start`, a
  // preview without blobs). Callers treat that as "no note yet".
  return getStore({ name: STORE, consistency: "strong" });
}

/** The ids Proteus says are on sale right now. */
async function currentOnSaleIds(): Promise<string[]> {
  const res = await fetch(ON_SALE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`on-sale list: ${res.status}`);
  const data = await res.json();
  const list: { id?: number | string }[] = Array.isArray(data?.products) ? data.products : [];
  return list.map((p) => String(p?.id)).filter((id) => id && id !== "undefined");
}

/**
 * Reads the note, refreshing it first if it's older than MAX_AGE_MS.
 *
 * Refreshing is driven by ordinary traffic rather than a scheduled job: a
 * request that finds the note stale updates it for everyone. That keeps the
 * moving parts to one file. Two requests can race and both write — last one
 * wins, and since they're writing near-identical data a few seconds apart,
 * that's harmless.
 */
export async function getSaleSeen(): Promise<SaleSeen> {
  let note: SaleSeen = EMPTY;
  let blob;

  try {
    blob = store();
    const saved = (await blob.get(KEY, { type: "json" })) as SaleSeen | null;
    if (saved && saved.firstSeen) note = saved;
  } catch {
    return EMPTY; // no store: the shop orders by product id, as before
  }

  const age = note.updatedAt ? Date.now() - new Date(note.updatedAt).getTime() : Infinity;
  if (age < MAX_AGE_MS) return note;

  try {
    const ids = await currentOnSaleIds();
    const now = new Date().toISOString();
    const firstSeen: Record<string, string> = {};
    for (const id of ids) {
      // Keep the original sighting; only genuinely new ones get "now".
      firstSeen[id] = note.firstSeen[id] ?? now;
    }
    // Anything no longer on sale is forgotten on purpose: if it comes back next
    // month that IS a new markdown, and should lead the row again.
    const fresh: SaleSeen = { firstSeen, updatedAt: now };
    await blob.setJSON(KEY, fresh);
    return fresh;
  } catch {
    return note; // Proteus down or write failed: last known note is still useful
  }
}
