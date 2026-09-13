import type { NextConfig } from "next";
import { PROTEUS_STOCK_KIOSK, PROTEUS_KIOSK_URL } from "./data/proteus-stock";

/**
 * Security + indexing headers live HERE, not in netlify.toml.
 *
 * Netlify's [[headers]] rules don't reliably reach Next.js server-rendered
 * pages — verified against a live deploy, where X-Robots-Tag and
 * X-Frame-Options were silently absent. Next applies these to its own
 * responses, so they work on any host.
 */

/** Site is hidden from search engines until SITE_PUBLIC=true. See README. */
const PREVIEW = process.env.SITE_PUBLIC !== "true";

// Framing headers protect the 21+ gate from being embedded/hidden by another
// site. Split out so the signage route can opt OUT of them.
const noFrame = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];
const baseSecurity = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
];

const nextConfig: NextConfig = {
  // ── Stock-Proteus switch (data/proteus-stock.ts) ─────────────────────────────
  // Kiosk switch. Returns nothing when it is off.
  async redirects() {
    if (!PROTEUS_STOCK_KIOSK) return [];
    return [
      // Tablets open thehighlifeny.com/kiosk; send them to Proteus's own kiosk
      // without anyone touching a tablet.
      //
      // permanent: false = 307. NEVER 308 here: a permanent redirect is cached by
      // the tablet's browser forever, so switching back would not bring the
      // tablets home.
      { source: "/kiosk", destination: PROTEUS_KIOSK_URL, permanent: false },
      { source: "/kiosk/:path*", destination: PROTEUS_KIOSK_URL, permanent: false },
    ];
  },
  // The checkout skin obeys the same switch, but not from here: see
  // app/stylesheets/proteus-shop-custom.css/route.ts. (A rewrite can't do it on
  // Netlify, which serves public/ files before Next's routing runs.)
  async headers() {
    const robots = PREVIEW ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : [];
    return [
      // Base security + robots on EVERY path (incl. /signage).
      { source: "/:path*", headers: [...baseSecurity, ...robots] },
      // No-framing on everything EXCEPT /signage. That route is a public in-store
      // menu display with no age gate to protect, so signage players (e.g.
      // OptiSigns) may embed it in an iframe. Negative lookahead excludes it.
      { source: "/((?!signage).*)", headers: noFrame },
    ];
  },
};

export default nextConfig;
