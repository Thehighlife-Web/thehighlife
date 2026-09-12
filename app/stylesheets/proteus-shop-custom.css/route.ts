import { PROTEUS_STOCK } from "@/data/proteus-stock";
import { CHECKOUT_SKIN_CSS } from "@/lib/checkout-skin";

/**
 * https://thehighlifeny.com/stylesheets/proteus-shop-custom.css
 *
 * Proteus's hosted checkout pages link this address (it's set in Proteus's admin),
 * so whatever is served here skins their checkout.
 *
 * ── WHY THIS IS A ROUTE AND NOT A FILE IN public/ ────────────────────────────
 * It used to be public/stylesheets/proteus-shop-custom.css. Netlify serves
 * public/ files straight from its edge, before Next's routing runs — so a
 * rewrite in next.config.ts could never swap it out (checked live: a
 * cache-busted request still returned the full file). A route handler is served
 * by Next, so it can obey the stock-Proteus switch.
 *
 * ── WHAT IT SERVES ───────────────────────────────────────────────────────────
 *   PROTEUS_STOCK true   an empty stylesheet — Proteus's checkout shows its own look
 *   PROTEUS_STOCK false  the dark High Life checkout skin (lib/checkout-skin.ts)
 *
 * Content-Type must be text/css: next.config.ts sends X-Content-Type-Options:
 * nosniff on every path, and under nosniff a browser refuses a stylesheet with
 * any other type.
 */
export function GET() {
  const body = PROTEUS_STOCK
    ? "/* Stock Proteus is switched on (data/proteus-stock.ts) — no checkout skin. */\n"
    : CHECKOUT_SKIN_CSS;

  return new Response(body, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      // Short, so flipping the switch reaches Proteus's checkout within minutes.
      "Cache-Control": "public, max-age=300",
    },
  });
}
