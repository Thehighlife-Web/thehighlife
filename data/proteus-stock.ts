/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ONE SWITCH — run the shop and the kiosk exactly as Proteus set them up.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *   true   Stock Proteus, nothing of ours on top:
 *            • /menu and /deals embed JSCart with Proteus's own settings only —
 *              their light theme, their "Shop Products" title, their sign-in,
 *              their checkout address. None of our fixes or skin.
 *            • /kiosk sends the tablets to Proteus's own ready-made kiosk.
 *            • Proteus's checkout pages stop loading our dark checkout skin.
 *
 *   false  Everything we built comes back, exactly as it was. Nothing was
 *          deleted — every component, rule and stylesheet is still in the repo,
 *          just not switched on.
 *
 * To undo: change `true` to `false` below, commit, push. That's the whole revert.
 * (The state before this switch existed is also tagged in git as
 *  `before-proteus-stock`.)
 *
 * The kiosk redirect is a TEMPORARY (307) redirect on purpose. A permanent one
 * (308) is cached by the tablet's browser forever, so flipping this back would
 * NOT bring the tablets home. A 307 is asked about fresh every load.
 *
 * ⚠️ WHAT STOCK TURNS BACK ON — both are Proteus account settings, and the only
 *    real fix for either is in Proteus's admin, not here:
 *      • Guest checkout. JSCart defaults anonCheckout to true, and Proteus's
 *        server allows it.
 *      • 18+ signups. Proteus serves minimum_age: 18 for this account. Our
 *        ProteusConfigFix forced 21; stock doesn't.
 */
export const PROTEUS_STOCK = true;

/** Proteus's hosted kiosk on the High Life domain. It sets its own checkoutUrl to
 *  its own origin, so sign-in and checkout stay on one host. */
export const PROTEUS_KIOSK_URL = "https://cart.thehighlifeny.com/kiosk/";
