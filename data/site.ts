/**
 * ─────────────────────────────────────────────────────────────
 *  THE HIGH LIFE DISPENSARY — SITE CONTENT
 * ─────────────────────────────────────────────────────────────
 *  This is the ONLY file you need to touch for normal updates.
 *  Change the deals each week here, then redeploy.
 *
 *  Products / prices / stock are NOT here — those come live
 *  from the Proteus 420 API on the menu page.
 * ─────────────────────────────────────────────────────────────
 */

export const store = {
  name: "The High Life Dispensary",
  addressLine1: "1300 Wellwood Ave",
  addressLine2: "West Babylon, NY 11704",
  email: "info@thehighlife.shop",
  license: "OCM-CAURD-25-000277-D1",
  legal:
    "The High Life™ is a trademark of Hydro Phonics, LLC. West Babylon NY. ©2026 All Rights Reserved. NYS OCM#: OCM-CAURD-25-000277-D1. All products, trademarks, service marks, trade names, and logos appearing on this site remain the property of their respective owners. For use only by adults 21 and older.",
};

/** Monday-first. `label` is what shows on the site. */
export const hours = [
  { day: "Mon", label: "9 AM — 9 PM" },
  { day: "Tue", label: "9 AM — 9 PM" },
  { day: "Wed", label: "9 AM — 9 PM" },
  { day: "Thu", label: "9 AM — 9 PM" },
  { day: "Fri", label: "9 AM — 9 PM" },
  { day: "Sat", label: "9 AM — 9 PM" },
  { day: "Sun", label: "10 AM — 8 PM" },
];

/**
 * ── SHOP CATEGORY BAR ──
 * The sticky green category banner under the header. IDs are JSCart's REAL
 * top-level category IDs (from the widget's getCategories), so each link opens
 * the shop already filtered to that category: /menu#view=products&cat=<id>.
 * "All Deals" routes to the deals page. Update this list if you add or rename a
 * top-level category in Proteus.
 */
export const shopCategories: { label: string; href: string }[] = [
  { label: "All Deals", href: "/deals" },
  { label: "Prerolls", href: "/menu#view=products&cat=9" },
  { label: "Flower", href: "/menu#view=products&cat=8" },
  { label: "Vapes", href: "/menu#view=products&cat=6" },
  { label: "Edibles", href: "/menu#view=products&cat=4" },
  // Drinks (13) is a child of Edibles in Proteus, hence its place in the strip.
  { label: "Drinks", href: "/menu#view=products&cat=13" },
  { label: "Concentrates", href: "/menu#view=products&cat=11" },
  { label: "Tinctures", href: "/menu#view=products&cat=12" },
  { label: "Topicals", href: "/menu#view=products&cat=7" },
  { label: "CBD", href: "/menu#view=products&cat=5" },
  { label: "Accessories", href: "/menu#view=products&cat=15" },
];

/**
 * ── YOUR COUPONS FROM PROTEUS ──
 *
 * These mirror Proteus → Coupon Management, so this list is easy to keep in
 * sync by hand. Field names match Proteus's columns on purpose: when they
 * expose a coupons API endpoint, this becomes a drop-in swap.
 *
 * `featured: true` → also shows in the sliding gallery on the homepage.
 *                    Everything here shows on /deals.
 *
 * ⚠️ Only list coupons whose Usability is "On Website" or "Everywhere".
 * ⚠️ Compliance: no gamification, nothing aimed at under-21, no below-fair-
 *    market pricing. Keep records of what you advertise.
 */
export type Deal = {
  /** brand chip on the card */
  tag: string;
  name: string;
  desc: string;
  /** the big green badge */
  value: string;
  valid: string;
  /** Proteus coupon code */
  code: string;
  /** Proteus coupon type */
  type: "percent" | "dollar" | "bogo" | "bundle";
  /** show in the homepage gallery too */
  featured?: boolean;
  /** extra brand spellings to match, when Proteus differs from `tag` */
  brandMatch?: string[];
};

export const deals: Deal[] = [
  // ── percent off ──────────────────────────────────────────────────────
  { tag: "Airo", name: "Airo 25% Off", desc: "25% off all Airo products", value: "25%", valid: "All week", code: "Airo 25", type: "percent", featured: true },
  { tag: "Puff", name: "Puff Pre-Rolls 40% Off", desc: "40% off all Puff pre-rolls", value: "40%", valid: "All week", code: "puff40", type: "percent", featured: true },
  { tag: "Old Pal", name: "Old Pal Grand Opening 30%", desc: "30% off Old Pal for our grand opening", value: "30%", valid: "Grand opening", code: "OPGOS30%", type: "percent", featured: true },
  { tag: "Stiiizy", name: "Stiiizy 20% Off Vapes", desc: "20% off all Stiiizy vapes", value: "20%", valid: "All week", code: "Stiiizy20%", type: "percent", featured: true },
  { tag: "Rove", name: "Rove Pre-Rolls 25%", desc: "25% off Rove pre-rolls", value: "25%", valid: "All week", code: "ROVEPR25", type: "percent", featured: true },
  { tag: "Fernway", name: "Fernway 20% Off", desc: "20% off all Fernway", value: "20%", valid: "All week", code: "fern 20", type: "percent" },
  { tag: "Picc", name: "Picc 20% Off", desc: "20% off all Picc products", value: "20%", valid: "All week", code: "PICC20", type: "percent" },
  { tag: "Chocolate", name: "All That Chocolate 20%", desc: "20% off All That Chocolate", value: "20%", valid: "All week", code: "ATC20", type: "percent" },
  { tag: "Jetty", name: "Jetty 15% Off", desc: "15% off all Jetty products", value: "15%", valid: "All week", code: "Jetty15", type: "percent" },
  { tag: "MFNY", name: "MFNY 10% Off", desc: "10% off all MFNY products", value: "10%", valid: "All week", code: "MFNY10", type: "percent" },
  { tag: "Synergy", name: "Synergy 10% Flower", desc: "10% off Synergy flower", value: "10%", valid: "All week", code: "SYN10", type: "percent" },

  // ── dollar off & bundles ─────────────────────────────────────────────
  { tag: "Halara", name: "Halara $10 Off", desc: "$10 off Halara for our grand opening", value: "$10", valid: "Grand opening", code: "Halara10$", type: "dollar", featured: true },
  { tag: "WANA", name: "WANA 2 For $40", desc: "Any two WANA products for $40", value: "2/$40", valid: "All week", code: "WANA40", type: "bundle", featured: true },
  { tag: "KOA", name: "KOA 2 For $90", desc: "Any two KOA products for $90", value: "2/$90", valid: "All week", code: "KOA90", type: "bundle" },
  { tag: "Mini Mart", name: "Mini Mart 2 For $40", desc: "Get any two Mini Mart for $40", value: "2/$40", valid: "All week", code: "MM2for40", type: "bundle" },
  // Proteus spells it "Lost Farm" (singular). Nothing in stock as of 7/21 —
  // the deal page says so rather than showing an empty grid.
  { tag: "Lost Farms", name: "Lost Farms Buy 3 Get 1", desc: "Buy any three Lost Farms, get the fourth free", value: "3+1", valid: "All week", code: "lostfarms3forfree", type: "bundle", brandMatch: ["Lost Farm"] },

  // ── BOGO ─────────────────────────────────────────────────────────────
  { tag: "High Falls", name: "High Falls 3.5g BOGO", desc: "Buy one High Falls 3.5g, get one", value: "BOGO", valid: "All week", code: "HFBOGO", type: "bogo", featured: true },
  { tag: "BigBuzz", name: "BigBuzz BOGO 50%", desc: "Buy one BigBuzz, get one 50% off", value: "BOGO 50%", valid: "All week", code: "BBB50", type: "bogo" },
  { tag: "MyHi", name: "MyHi BOGO 50%", desc: "Buy one MyHi, get one 50% off", value: "BOGO 50%", valid: "All week", code: "MYHIBOGO50", type: "bogo" },
  { tag: "MyHi", name: "Thirsty Thursday BOGO", desc: "MyHi buy one get one, Thursdays only", value: "BOGO", valid: "Thursdays", code: "MYHIBOGO", type: "bogo" },
  { tag: "Chew & Chill", name: "Chew And Chill BOGO", desc: "Buy one get one, Thursday through Sunday", value: "BOGO", valid: "Thurs – Sun", code: "chew4chillThurs-Sunday", type: "bogo" },
  { tag: "Sunday", name: "Sunday BOGO 50%", desc: "Buy one Sunday, get one 50% off", value: "BOGO 50%", valid: "All week", code: "Sunday50", type: "bogo" },
  { tag: "Sacci", name: "Sacci AIO BOGO 50%", desc: "Buy one Sacci AIO, get one 50% off", value: "BOGO 50%", valid: "All week", code: "145479213967", type: "bogo" },
  { tag: "Brass Knuckles", name: "Brass Knuckles BOGO", desc: "Buy one Brass Knuckles, get one", value: "BOGO", valid: "All week", code: "BRASSKULESBOGO", type: "bogo" },
  { tag: "BudJet", name: "BudJet BOGO", desc: "Buy one BudJet, get one", value: "BOGO", valid: "All week", code: "BudBOGO", type: "bogo" },
  { tag: "High5", name: "High5 BOGO", desc: "Buy one High5, get one", value: "BOGO", valid: "All week", code: "HI5BOGO", type: "bogo" },
  { tag: "Miss Perry", name: "Miss Perry BOGO", desc: "Buy one Miss Perry, get one", value: "BOGO", valid: "All week", code: "PERRYBOGO", type: "bogo" },
  { tag: "Mac Pharms", name: "Mac Pharms BOGO Pre-Rolls", desc: "Buy one Mac Pharms pre-roll, get one", value: "BOGO", valid: "All week", code: "MACPRBOGO", type: "bogo" },
  { tag: "VitaBudz", name: "VitaBudz Gummy BOGO", desc: "Buy one VitaBudz gummy, get one", value: "BOGO", valid: "All week", code: "VitabudzBOGO", type: "bogo" },
  // "TheOne" is stocked under the brand "ALL STATE" in Proteus.
  { tag: "TheOne", name: "TheOne BOGO AIO", desc: "Buy one TheOne, get an AIO", value: "BOGO", valid: "All week", code: "THEONEBOGO", type: "bogo", brandMatch: ["All State"] },
  { tag: "Animal House", name: "Animal House Buy 1 Get 1 30%", desc: "Buy one Animal House, get one 30% off", value: "B1G1 30%", valid: "All week", code: "AH B1GO30OFF", type: "bogo" },
  { tag: "Fernway", name: "Fernway 510 Stylus BOGO", desc: "Buy one Fernway, get a 510 stylus", value: "BOGO", valid: "All week", code: "Fernway BOGO Stylus", type: "bogo" },
  { tag: "Eureka", name: "Eureka Starter Kit + Pod", desc: "Buy any Eureka starter kit, get a pod 50% off", value: "50%", valid: "All week", code: "EUREKAPODS", type: "bogo" },
  { tag: "Juniper Jill", name: "Juniper Jill Pre-Roll 50%", desc: "Buy any Juniper Jill item, get a pre-roll 50% off", value: "50%", valid: "All week", code: "JUNJILJOINT", type: "bogo" },
  { tag: "Florist Farms", name: "Florist Farms + 2pk Gummy", desc: "Buy anything from Florist Farms, get a 2pk gummy", value: "2pk", valid: "All week", code: "FF Free Gummy", type: "bogo" },

  /**
   * ⚠️ These two run in the register at $0.01, but the PRICE IS NOT ADVERTISED
   * here — a penny price on cannabis reads as a giveaway, and NY restricts
   * advertising free/nominal-price cannabis. The promo still works in store;
   * we just say "Add-On" and let the budtender apply it.
   *
   * ✏️ Confirm with your compliance contact. If they're comfortable with the
   * price being public, you can put "$0.01" back in `value` and `desc`.
   */
  { tag: "Jeeter", name: "Jeeter Pre-Roll Add-On", desc: "Buy any Jeeter and add a .5g pre-roll — ask us in store", value: "Add-On", valid: "All week", code: "jeeter.5g3", type: "bogo" },
  { tag: "Stiiizy", name: "Stiiizy 5pk Add-On", desc: "Buy a Stiiizy 5pk and add a single — ask us in store", value: "Add-On", valid: "All week", code: "597949746919", type: "bogo" },
];

/** The subset shown in the homepage sliding gallery. */
export const featuredDeals: Deal[] = deals.filter((d) => d.featured);

/** URL-safe id for a deal, used by /deals/[slug]. */
export function dealSlug(d: Deal): string {
  return d.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findDealBySlug(slug: string): Deal | undefined {
  return deals.find((d) => dealSlug(d) === slug);
}

/**
 * The JSCart brand slug a deal points at, so a deal can deep-link the shop
 * straight to that brand: `/menu#view=products&brand=<slug>`. JSCart slugs are
 * lowercase with non-alphanumeric runs collapsed to "-" (e.g. "Old Pal" →
 * "old-pal"). A handful of deal tags aren't the brand's exact name, so those are
 * aliased here. An unknown slug is harmless — JSCart just shows the full shop.
 */
const BRAND_SLUG_ALIASES: Record<string, string> = {
  chocolate: "all-that-chocolate",
  bigbuzz: "the-big-buzz",
  high5: "high-5-s",
};

export function dealBrandSlug(d: Deal): string {
  const raw = (d.brandMatch?.[0] ?? d.tag)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return BRAND_SLUG_ALIASES[raw] ?? raw;
}

/** Shop URL for a deal — the JSCart menu pre-filtered to the deal's brand. */
export function dealShopHref(d: Deal): string {
  const slug = dealBrandSlug(d);
  return slug ? `/menu#view=products&brand=${slug}` : "/menu";
}

/** "Chew & Chill" and "CHEW AND CHILL" have to compare equal. */
function normalizeBrand(s: string): string {
  return s.toLowerCase().replace(/\band\b/g, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Does this product belong to this deal?
 *
 * Checks TWO places, because Proteus isn't consistent:
 *   1. `brand_name` — the usual case.
 *   2. The leading segment of the product name ("Lost Farm | Gummy | …").
 *      Sub-brands live here: Lost Farm gummies carry brand_name "Kiva", so
 *      brand-only matching would miss all of them.
 *
 * Matching is exact-or-prefix. A bare `includes` would let a short tag like
 * "Find" swallow unrelated brands.
 */
export function dealMatchesProduct(
  d: Deal,
  product: { brand?: string; name?: string }
): boolean {
  const keys = [d.tag, ...(d.brandMatch ?? [])].map(normalizeBrand).filter(Boolean);
  if (!keys.length) return false;

  const candidates: string[] = [];
  if (product.brand) candidates.push(normalizeBrand(product.brand));
  // product names are formatted "Brand | Type | Detail"
  if (product.name) {
    const head = product.name.split("|")[0];
    if (head) candidates.push(normalizeBrand(head));
  }

  return candidates
    .filter(Boolean)
    .some((c) => keys.some((k) => c === k || c.startsWith(k) || k.startsWith(c)));
}

export type Category = {
  name: string;
  desc: string;
  /**
   * Path to the tile photo. Leave "" and the tile renders an on-brand
   * gradient instead. To add a photo: drop the file in
   * public/images/categories/ and put its path here.
   */
  image: string;
  /** matches the category name used by the Proteus menu */
  slug: string;
};

export const categories: Category[] = [
  {
    name: "Flower",
    desc: "Jarred eighths, ounces & singles from New York growers",
    image: "/images/categories/flower.webp",
    slug: "flower",
  },
  {
    name: "Pre-Rolls",
    desc: "Singles, packs & infused — rolled and ready to spark",
    image: "/images/categories/prerolls.webp",
    slug: "pre-rolls",
  },
  {
    name: "Vapes",
    desc: "510 carts, all-in-one disposables & live-resin pens",
    image: "/images/categories/vapes.webp",
    slug: "vapes",
  },
  {
    name: "Edibles",
    desc: "Gummies, chocolate & drinks, precisely dosed",
    image: "/images/categories/edibles.webp",
    slug: "edibles",
  },
  {
    name: "Concentrate",
    desc: "Rosin, badder, diamonds, sauce & sugar",
    image: "/images/categories/concentrate.webp",
    slug: "concentrate",
  },
  {
    name: "Topicals",
    desc: "Balms, lotions & roll-ons for targeted relief",
    image: "/images/categories/topicals.webp",
    slug: "topicals",
  },
  // ── no photo yet: these render an on-brand gradient tile until you add one ──
  {
    name: "Accessories",
    desc: "Batteries, grinders, papers, lighters & tips",
    image: "",
    slug: "accessories",
  },
  {
    name: "Tinctures",
    desc: "Sublingual drops & oils, measured to the milligram",
    image: "",
    slug: "tinctures",
  },
  {
    name: "CBD",
    desc: "Low-THC and CBD-forward products for everyday relief",
    image: "",
    slug: "cbd",
  },
];

/**
 * JSCart's numeric category IDs (from the widget's getCategories), keyed by our
 * category slug. Used to deep-link the shop to a category: the JSCart hash uses
 * the numeric id (cat=<id>), NOT our slug. Keep in sync with shopCategories.
 */
const CATEGORY_CAT_ID: Record<string, number> = {
  flower: 8,
  "pre-rolls": 9,
  vapes: 6,
  edibles: 4,
  concentrate: 11,
  topicals: 7,
  accessories: 15,
  tinctures: 12,
  cbd: 5,
};

/** Deep-link URL to the JSCart shop filtered to a category (by our slug). */
export function categoryMenuHref(slug: string): string {
  const id = CATEGORY_CAT_ID[slug];
  return id ? `/menu#view=products&cat=${id}` : "/menu";
}

/**
 * DEAL OF THE DAY — the bar across the top of every page (components/DealBanner).
 *
 * To run a new one, edit this object. To run none, set it to null.
 *
 * `endsAt` is a hard stop: the bar is not rendered after it, and a page already
 * open when it passes removes the bar on the spot — so nothing needs to be taken
 * down by hand, and the site can never advertise a deal that has ended. Write it
 * with the Eastern offset spelled out: -04:00 in summer (EDT), -05:00 in winter
 * (EST). A bare "2026-09-11T21:00" would be read in the VISITOR's timezone.
 *
 * `href` should be the deal's own coupon in the menu, so the tap lands on the
 * products the deal actually applies to. The number is the Proteus coupon id,
 * from https://cart.proteus420.com/highlife/api_cart_v2.cfm?action=deals.
 * Check the deal exists there before advertising it — a promotion the checkout
 * won't apply is worse than no promotion.
 */
export type DealOfTheDay = {
  /** product line, as a customer would say it */
  title: string;
  /** the offer in full, for wide screens */
  offer: string;
  /** the offer in brief, for phones */
  offerShort: string;
  href: string;
  /** ISO timestamp WITH offset, e.g. "2026-09-11T21:00:00-04:00" */
  endsAt: string;
  /** how the end is said aloud, e.g. "9 PM" */
  endsLabel: string;
};

export const dealOfTheDay: DealOfTheDay | null = {
  title: "Miss Grass Pre-Roll",
  offer: "Buy 1 Get 1",
  offerShort: "B1G1",
  // Proteus coupon #99, "Miss grass Spark pre rolls B1G1" — Miss Grass Sparks 0.4g.
  href: "/menu#view=products&coupon=99",
  // Saturday 19 September 2026, 9:00 PM Eastern.
  endsAt: "2026-09-19T21:00:00-04:00",
  endsLabel: "9 PM",
};

/**
 * Shown on the homepage (components/Stats.tsx) and /about — both read this list,
 * so a change here lands on both.
 *
 * Keep it to things that are true on any given day and need no small print. A
 * fourth entry, "15% Off Your First Visit", was removed on 9 September 2026: the
 * offer was no longer being advertised, and a discount promised on the homepage
 * that a customer cannot then claim is worse than no discount at all.
 *
 * If a fourth is ever added, `.statgrid` in globals.css needs its column count
 * put back to 4 — it is set to the number of entries so no cell sits empty.
 */
export const stats = [
  { count: 40, suffix: "+", label: "Brands On Shelf" },
  { count: 100, suffix: "%", label: "Lab-Tested (NY OCM)" },
  { count: 7, suffix: "", label: "Days A Week Open" },
];

/**
 * ── VIDEO WALL (/signage/wall) ──
 * The 6 category columns across the 3-screen wall, in order left→right.
 * `screen` N shows columns [2N-2, 2N-1]:
 *   Screen 1 → Flower, Pre-Rolls · Screen 2 → Vapes, Edibles · Screen 3 → Concentrate, Tinctures
 * `slug` must match a Proteus category slug (see `categories` above). Edit freely.
 */
export const wallColumns: { slug: string; title: string }[] = [
  { slug: "flower", title: "Flower" },
  { slug: "pre-rolls", title: "Pre-Rolls" },
  { slug: "vapes", title: "Vapes" },
  { slug: "edibles", title: "Edibles" },
  { slug: "concentrate", title: "Concentrate" },
  { slug: "tinctures", title: "Tinctures" },
];

/** Seconds of scroll per product (higher = slower). Tune for readability. */
export const WALL_SECONDS_PER_ITEM = 3.2;

/**
 * ── ABOUT PAGE COPY ──
 * ✏️ REPLACE THIS WITH YOUR REAL STORY. I don't know your history, so I've
 * written something safe and true-but-generic. It will read much better in
 * your own words — why you opened, who's behind the counter, what you care
 * about. Just edit the text between the quotes.
 */
/**
 * About page copy, in the owner's own words.
 * Wrap anything in **double asterisks** to bold it.
 */
export const about = {
  headline: "About The High Life",
  paragraphs: [
    "Welcome to **The High Life**, Long Island's destination for premium cannabis at unbeatable prices. Conveniently located at **1300 Wellwood Avenue, West Babylon, NY 11704**, we're proud to serve customers from across Long Island with one of the area's largest selections of trusted New York cannabis brands.",
    "Whether you're looking for flower, pre-rolls, vapes, edibles, concentrates, or wellness products, our knowledgeable team is here to help you find the perfect product for your needs. We believe everyone deserves access to high-quality cannabis without overpaying, which is why we're committed to offering the best products at the best prices every day.",
    "At The High Life, shopping is simple, welcoming, and stress-free. Whether you're a first-time customer or a seasoned cannabis enthusiast, we're dedicated to providing exceptional service, competitive pricing, and an experience that keeps you coming back.",
    "Stop by today and discover why more Long Island customers are choosing **The High Life** — where premium cannabis meets unbeatable value.",
  ],
};

/**
 * NYS adult-use cannabis retail tax — 13% (9% state + 4% local).
 * Every product in the catalog is flagged taxable in Proteus, so this applies
 * to the whole list. Edit here if the rate ever changes.
 */
export const CANNABIS_TAX_RATE = 0.13;

/** Required NY compliance warning. Do not reword without compliance review. */
export const WARNING_TEXT =
  "Cannabis Products sold here contain THC. Do NOT consume or use if pregnant or nursing. Cannabis can impair concentration and coordination. Do not operate a vehicle or machinery under the influence of cannabis. For use only by adults 21 years of age and older. Keep out of reach of children and pets. In case of accidental ingestion or overconsumption, contact the Poison Center at 1-800-222-1222 or call 9-1-1. Please consume responsibly. If you have questions regarding safe handling and storage please ask and we will be more than happy to help. Keep out of reach of children and pets. In case of accidental ingestion or overconsumption, contact the National Poison Control Center hotline 1-800-222-1222 or call 9-1-1. Please consume responsibly. Cannabis is not recommended for use by persons who are pregnant or nursing. Concerned about your cannabis use? Text HOPENY, call 1-877-8-HOPENY, or visit oasas.ny.gov/HOPELine";
