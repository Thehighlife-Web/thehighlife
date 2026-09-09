/**
 * ══════════════════════════════════════════════════════════════════════
 *  PROTEUS 420 CLIENT
 * ══════════════════════════════════════════════════════════════════════
 *
 *  This module only READS. It fetches the live catalogue from Proteus and
 *  normalises it for the site.
 *
 *  There is no write path. Ordering runs entirely through Proteus's own
 *  JSCart widget (see app/components/ProteusShop.tsx), which owns the cart,
 *  checkout, accounts and payment. The custom pickup-order system that used
 *  to live at the bottom of this file was retired on 22 August 2026 when the
 *  site consolidated onto that widget; it is in git history if ever needed.
 *
 *  🔒 Credentials come from .env.local and never reach the browser. This
 *     module is server-only; importing it into a client component fails.
 * ══════════════════════════════════════════════════════════════════════
 */

import type {
  LabData,
  MenuResult,
  Product,
  Terpene,
} from "./types";

const CLIENT = process.env.PROTEUS_CLIENT_NAME ?? "highlife";
const PASS = process.env.PROTEUS_WEBSERVICE_PASS ?? "";
/**
 * The integration identity sent on every call. Per the Proteus API docs: "Each
 * integration (app, website access, etc) will be given a specific AppName which
 * must be included in all API calls." Proteus uses it to attribute an order's
 * SOURCE — set it to your WEBSITE integration's AppName so pickup orders show as
 * a web order instead of a register/POS sale. Blank still creates the order, but
 * it lands untagged (shows as POS). Found in Proteus → API Keys / Integrations.
 */
const APP_NAME = process.env.PROTEUS_APP_NAME ?? "";
const BASE = `https://api.proteuserp.com/${CLIENT}/webservices`;

/** Proteus returns names URL-encoded, e.g. "Ground%20Flower". */
function decode(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Maps Proteus's category names onto the six categories the site shows.
 * Products carry the SUB-category name (e.g. "AIO", "3.5g Flower"), not
 * the top-level one, so every variant has to be listed here.
 */
const CATEGORY_MAP: Record<string, string[]> = {
  flower: [
    "flower", "1g flower", "3.5g flower", "7g flower (1/4 oz)", "14g flower (1/2 oz)",
    "28g flower (1 oz)", "ground flower", "infused flower",
  ],
  "pre-rolls": [
    "all prerolls", "prerolls", "infused prerolls", "un-infused pre rolls",
    "pre roll packs", "infused pre roll packs", "blunts", "infused blunts",
  ],
  vapes: ["vapes", "aio", "510 cart", "pod", "live rosin vape"],
  edibles: ["edibles", "gummies", "chocolates", "tablets", "drinks"],
  concentrate: ["concentrates", "concentrate", "live resin", "rosin", "hash", "applicators"],
  topicals: ["topicals", "lotions", "balms"],
  // present in Proteus but not currently shown on the site
  accessories: ["accessories", "batteries", "rolling papers", "grinders", "lighters", "tips"],
  tinctures: ["tinctures"],
  cbd: ["cbd"],
  promos: ["promos"],
};

const LOOKUP: Record<string, string> = {};
for (const [slug, names] of Object.entries(CATEGORY_MAP)) {
  for (const n of names) LOOKUP[n] = slug;
}

export function categorize(rawCategory: string): string {
  const s = decode(rawCategory).toLowerCase().trim();
  if (!s) return "uncategorized";
  if (LOOKUP[s]) return LOOKUP[s];

  // fallback for anything new Proteus adds later
  if (s.includes("preroll") || s.includes("pre roll") || s.includes("blunt")) return "pre-rolls";
  if (s.includes("flower")) return "flower";
  if (s.includes("vape") || s.includes("cart") || s.includes("aio") || s.includes("pod")) return "vapes";
  if (s.includes("edible") || s.includes("gumm") || s.includes("chocolate") || s.includes("drink")) return "edibles";
  if (s.includes("concentrate") || s.includes("rosin") || s.includes("resin") || s.includes("hash")) return "concentrate";
  if (s.includes("topical") || s.includes("lotion") || s.includes("balm")) return "topicals";
  return s.replace(/\s+/g, "-");
}

type RawProduct = Record<string, unknown>;

function mapProduct(raw: RawProduct): Product {
  const proteusCategory = decode(raw.category);
  const strain = decode(raw.strain_name);
  return {
    id: String(raw.product_id ?? ""),
    sku: decode(raw.sku) || undefined,
    name: decode(raw.name) || "Unnamed product",
    brand: decode(raw.brand_name) || undefined,
    category: categorize(proteusCategory),
    proteusCategory: proteusCategory || undefined,
    // Proteus sometimes stores "0" in strain_name — treat that as empty
    strain: strain && strain !== "0" ? strain : undefined,
    price: num(raw.price),
    salePrice: num(raw.sale_price),
    unit: decode(raw.unit) || undefined,
    imageUrl: decode(raw.image) || undefined,
    stockCount: num(raw.num_in_stock),
    inStock: (num(raw.num_in_stock) ?? 0) > 0,
  };
}

/**
 * Proteus stores descriptions as HTML. We do NOT render that HTML directly —
 * it's staff-editable content and injecting it would be an XSS hole. Strip to
 * plain paragraphs instead; the copy is marketing prose, so nothing is lost.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Proteus descriptions are AI-generated marketing prose, and some assert a
 * potency figure that contradicts the product's actual lab data — e.g. copy
 * claiming "a THC level of 20.0%" on an item whose `thc` field says otherwise.
 *
 * On a regulated product the site must never advertise a number that disagrees
 * with the lab result, so any sentence making a cannabinoid percentage claim is
 * dropped. We remove the WHOLE SENTENCE rather than just the figure, because
 * deleting the number alone leaves mangled copy ("With a  , this product…").
 *
 * `mg` dosages are left alone: those are edible serving sizes, are normally
 * repeated in the product name, and aren't the contradiction risk that % is.
 * After this, every number a customer sees comes from the verified `lab` fields.
 */
const CANNABINOIDS = "THCA|THCV|CBDA|THC|CBD|CBG|CBN|CBC";
const POTENCY_CLAIM = new RegExp(
  // "THC level of 20.0%" / "THC: 20%" / "THC is 20 %"
  `\\b(?:${CANNABINOIDS})\\b\\s*(?:level|content|potency)?\\s*(?:of|:|is|at|=)?\\s*[\\d.]+\\s*%` +
    // …or the other way round: "20% THC"
    `|[\\d.]+\\s*%\\s*(?:of\\s+)?\\b(?:${CANNABINOIDS})\\b`,
  "i"
);

export function stripPotencyClaims(text: string): string {
  if (!text) return "";
  return text
    .split("\n\n")
    .map((para) =>
      para
        // keep the delimiter so sentences stay intact when rejoined
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !POTENCY_CLAIM.test(sentence))
        .join(" ")
        .trim()
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

/**
 * Parses Proteus's `top3terps`, which looks like:
 *   "Linalool 0.56,Linalool 0.56,Beta-caryophyllene 0.24"
 *
 * Note the duplicate — the source data repeats entries, so we de-duplicate by
 * name (keeping the highest reading) and sort strongest first.
 */
function parseTerps(raw: string): Terpene[] {
  if (!raw) return [];
  const best = new Map<string, number>();

  for (const chunk of raw.split(",")) {
    const m = chunk.trim().match(/^(.+?)\s+([\d.]+)\s*%?$/);
    if (!m) continue;
    const name = m[1].trim();
    const percent = Number(m[2]);
    if (!name || !Number.isFinite(percent) || percent <= 0) continue;
    const key = name.toLowerCase();
    if (!best.has(key) || best.get(key)! < percent) best.set(key, percent);
  }

  return [...best.entries()]
    .map(([key, percent]) => ({
      // restore display casing from the first occurrence
      name: raw.match(new RegExp(`(^|,)\\s*(${key.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")})`, "i"))?.[2] ?? key,
      percent,
    }))
    .sort((a, b) => b.percent - a.percent);
}

/** Builds the lab-data block, omitting anything Proteus left empty/zero. */
function mapLabData(raw: RawProduct): LabData | undefined {
  const pick = (v: unknown) => {
    const n = num(v);
    return n !== undefined && n > 0 ? n : undefined;
  };

  const lab: LabData = {
    thc: pick(raw.thc),
    thca: pick(raw.thca),
    thcv: pick(raw.thcv),
    cbd: pick(raw.cbd),
    cbda: pick(raw.cbda),
    cbg: pick(raw.cbg),
    cbn: pick(raw.cbn),
    cbc: pick(raw.cbc),
    terpsTotal: pick(raw.terps),
  };

  const topTerps = parseTerps(decode(raw.top3terps));
  if (topTerps.length) lab.topTerps = topTerps;

  // drop the object entirely if we learned nothing
  return Object.values(lab).some((v) => v !== undefined) ? lab : undefined;
}

/**
 * `categoryListProducts` carries the good stuff — THC/CBD, terpenes,
 * dominance, descriptions — but only covers ~70% of the catalog, so it's
 * used to ENRICH the full product list rather than replace it.
 *
 * Returns a map keyed by product id.
 */
type Enrichment = Partial<Product> & { medicalOnly?: boolean };

async function fetchEnrichment(): Promise<Map<string, Enrichment>> {
  const out = new Map<string, Enrichment>();
  const res = (await call("products_json.cfm", { action: "categoryListProducts" })) as {
    categories?: { name?: unknown; products?: RawProduct[] }[];
  };

  for (const cat of res?.categories ?? []) {
    for (const raw of cat.products ?? []) {
      const id = String(raw.id ?? "");
      if (!id) continue;
      const dominance = decode(raw.dominance);
      const strain = decode(raw.strain);
      const description = stripPotencyClaims(htmlToText(decode(raw.description)));
      // ⚠️ `raw.cost` is the WHOLESALE COST. Never map it — it must not reach
      // the browser. Deliberately not read here.
      out.set(id, {
        dominance: dominance && dominance !== "0" ? dominance : undefined,
        strain: strain && strain !== "0" ? strain : undefined,
        description: description || undefined,
        brand: decode(raw.brand) || undefined,
        lab: mapLabData(raw),
        // what the register will actually let someone buy — can be lower than
        // (or negative vs) the physical count in `num_in_stock`
        stockCount: num(raw.inventory_sellable),
        medicalOnly: Boolean(decode(raw.medicalsalesonly) && decode(raw.medicalsalesonly) !== "0"),
      });
    }
  }
  return out;
}

async function call(file: string, params: Record<string, string>): Promise<unknown> {
  const res = await fetch(`${BASE}/${file}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ AppName: APP_NAME, webservicepass: PASS, ...params }),
    // Proteus needs POST, and Next only caches GET — so we cache in-process below.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Proteus ${file} returned ${res.status} ${res.statusText}`);
  const text = await res.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Proteus ${file} returned non-JSON (${text.slice(0, 120)}…)`);
  }

  /**
   * Proteus answers auth/permission failures with HTTP 200 and a body like
   * {"error": "..."} — so a bad key looks like a SUCCESSFUL empty catalog
   * unless we check for this. Left unhandled, the menu cheerfully reports
   * "0 products in stock", which reads to a customer as "they have nothing".
   * Turn it into a real failure so the unavailable page shows instead.
   */
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const err = (parsed as Record<string, unknown>).error;
    if (typeof err === "string" && err.trim()) {
      throw new Error(`Proteus ${file}: ${err}`);
    }
  }

  return parsed;
}

export function isConfigured(): boolean {
  return Boolean(CLIENT && PASS);
}

/**
 * Register rows that aren't things a customer can shop for.
 *
 * The POS carries fee lines, test records and internal samples alongside
 * real stock — e.g. "Debit Fee" ($3.50, 336 on hand) and "OCM TEST 1/8".
 * Those must never render on a public menu.
 *
 * ✏️ Add a pattern here if something odd shows up. The cleaner fix is to
 * mark the item inactive (or move it to a hidden category) inside Proteus.
 */
const NOT_A_PRODUCT: RegExp[] = [
  /^\s*debit\s*fee\s*$/i,
  /^\s*(atm|credit|card|service|processing)\s*fee\s*$/i,
  /^\s*sample\s*\|/i,
  /\bocm\s+test\b/i,
  /^\s*(test|do not use|dnu)\b/i,
  // Vendor promo SKUs. The name itself reads as internal ("PROMO | Rove | …"),
  // so they're hidden from the public menu — they still sell fine in store.
  // Anchored to the START of the name on purpose: a loose /promo/ would also
  // catch legitimate products like "Sugar Free" or "God's Gift".
  // ✏️ Delete this line to show them again.
  /^\s*promo\s*\|/i,
];

function isPublicProduct(p: Product & { medicalOnly?: boolean }): boolean {
  if (!p.name) return false;
  if (NOT_A_PRODUCT.some((re) => re.test(p.name))) return false;
  // Defensive: nothing flagged medical-only belongs on an adult-use menu.
  // No products carry this today, but the flag exists in Proteus.
  if (p.medicalOnly) return false;
  // $0.00 / $0.01 rows are placeholders or promos — and NY bars advertising
  // cannabis giveaways, so they don't belong on the menu either way.
  if (p.price == null || p.price < 0.5) return false;
  return true;
}

/* ── in-process cache ──────────────────────────────────────────────────
   The catalog is ~3,400 products across 4 paginated calls. We hold the
   result for 5 minutes so page views don't re-hit Proteus every time.
   ───────────────────────────────────────────────────────────────────── */
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; result: MenuResult } | null = null;

/**
 * Fetches the whole active catalog.
 *
 * ⚠️ `startrow` is NOT a row offset — the docs say "product id to begin
 * with", i.e. it filters `product_id >= startrow`. Treating it as an
 * offset re-fetches overlapping ranges (we measured 1,564 duplicates
 * across 3,419 rows). So we page by walking the product id forward, and
 * key by id as a belt-and-braces guard against any remaining overlap.
 */
async function fetchAllProducts(): Promise<Product[]> {
  const byId = new Map<string, Product>();
  let cursor = 0;

  for (let guard = 0; guard < 50; guard++) {
    const page = (await call("products_json.cfm", {
      action: "getProductsById",
      startrow: String(cursor),
      maxrows: "1000",
      active: "1",
    })) as RawProduct[];

    if (!Array.isArray(page) || page.length === 0) break;

    let maxId = cursor;
    for (const raw of page) {
      const p = mapProduct(raw);
      if (p.id) byId.set(p.id, p);
      const n = Number(raw.product_id);
      if (Number.isFinite(n) && n > maxId) maxId = n;
    }

    if (page.length < 1000) break;
    if (maxId <= cursor) break; // no forward progress — stop rather than loop forever
    cursor = maxId + 1;
  }

  return [...byId.values()];
}

export async function getMenu(): Promise<MenuResult> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.result;

  if (!isConfigured()) {
    return { products: [], live: false, error: "Proteus credentials not set" };
  }

  try {
    // the catalog is the source of truth for what's in stock; the enrichment
    // call only fills in lab data / descriptions where Proteus has them
    const [catalog, enrichment] = await Promise.all([
      fetchAllProducts(),
      fetchEnrichment().catch(() => new Map<string, Enrichment>()),
    ]);

    const products = catalog
      .map((p) => {
        const extra = enrichment.get(p.id);
        if (!extra) return p;

        /**
         * `num_in_stock` is the physical count; `inventory_sellable` is what the
         * register will actually sell. They disagree on ~400 products — some sit
         * at 9 on hand but 0 sellable. Advertising those sends customers in for
         * something they can't buy, so sellable wins whenever Proteus gives it.
         */
        const sellable = extra.stockCount;
        const effective = sellable ?? p.stockCount;

        return {
          ...p,
          // only overwrite when the enrichment actually has a value
          brand: p.brand ?? extra.brand,
          strain: p.strain ?? extra.strain,
          dominance: extra.dominance,
          description: extra.description,
          lab: extra.lab,
          stockCount: effective,
          onHandCount: p.stockCount,
          inStock: (effective ?? 0) > 0,
          medicalOnly: extra.medicalOnly,
        };
      })
      .filter((p) => p.inStock && isPublicProduct(p));

    /**
     * A real dispensary always has stock. An empty catalog means something is
     * wrong upstream (auth, an API change, a bad response) rather than "we
     * sold out of everything" — so treat it as unavailable instead of telling
     * customers we have nothing. Not cached, so it retries on the next view.
     */
    if (products.length === 0) {
      return {
        products: [],
        live: false,
        error: "Proteus returned no products — the menu looks empty upstream.",
      };
    }

    const result: MenuResult = { products, live: true, fetchedAt: Date.now() };
    cache = { at: Date.now(), result };
    return result;
  } catch (e) {
    /**
     * NO PLACEHOLDER PRODUCTS.
     *
     * Showing invented stock on a dispensary menu sends customers in for
     * things we don't have, and puts prices on screen that were never real.
     * An empty menu with an honest "temporarily unavailable" message is the
     * safer failure — the page says what's wrong instead of lying.
     */
    return {
      products: [],
      live: false,
      error: e instanceof Error ? e.message : "Could not reach Proteus",
    };
  }
}
