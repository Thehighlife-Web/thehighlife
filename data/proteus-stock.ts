/**
 * ════════════════════════════════════════════════════════════════════════════
 *  TWO SWITCHES — run each surface as Proteus set it up, or as we built it.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * PROTEUS_STOCK_WEBSITE — /menu, /deals, and Proteus's checkout pages
 *   true   JSCart embedded with Proteus's own settings only: their light theme,
 *          their "Shop Products" title, their sign-in, their checkout address,
 *          none of our fixes, and no dark skin on their checkout pages.
 *   false  Our layout and everything we built: the brand skin, the fixes (21+
 *          signups, guest checkout off, stock limits, search, garbled text…),
 *          the deals button, the pickup-time hint, the dark checkout skin.
 *
 *   ⚠️ The checkout pages are shared. Proteus's own kiosk checks out on the same
 *      pages, so the dark checkout skin shows there too whenever this is false.
 *
 * PROTEUS_STOCK_KIOSK — /kiosk
 *   true   The tablets are sent to Proteus's own ready-made kiosk
 *          (PROTEUS_KIOSK_URL). Its look, guest checkout and 18+ signup age are
 *          Proteus's settings and can only be changed in Proteus's admin.
 *   false  Our kiosk comes back, exactly as it was.
 *
 * Nothing was deleted either way — every component, rule and stylesheet is still
 * in the repo. To flip one: change true/false below, commit, push. The state
 * before any of this existed is also tagged in git as `before-proteus-stock`.
 *
 * The kiosk redirect is a TEMPORARY (307) redirect on purpose. A permanent one
 * (308) is cached by the tablet's browser forever, so switching the kiosk back
 * would NOT bring the tablets home. A 307 is asked about fresh every load.
 */
export const PROTEUS_STOCK_WEBSITE = false;
export const PROTEUS_STOCK_KIOSK = false;

/** Proteus's hosted kiosk on the High Life domain. It sets its own checkoutUrl to
 *  its own origin, so sign-in and checkout stay on one host. */
export const PROTEUS_KIOSK_URL = "https://cart.thehighlifeny.com/kiosk/";
