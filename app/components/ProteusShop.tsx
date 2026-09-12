"use client";

import { useEffect, useRef } from "react";
import AccountLinkPrompt from "./AccountLinkPrompt";
import ProteusTextFix from "./ProteusTextFix";
import AuthModalGuard from "./AuthModalGuard";
import ProteusSearchFix from "./ProteusSearchFix";
import ProteusConfigFix from "./ProteusConfigFix";
import PickupTimeHint from "./PickupTimeHint";
import ProteusStockLimit from "./ProteusStockLimit";
import KioskQuickAuth from "./KioskQuickAuth";
import KioskAuthTrace from "./KioskAuthTrace";
import { PROTEUS_STOCK } from "@/data/proteus-stock";

/**
 * Embeds Proteus's JSCart widget (the store's real cart / checkout / delivery /
 * ID-upload / accounts) inside our custom site. The widget is a self-contained
 * script that mounts into #proteus_shop and runs its own SPA — we just load it
 * and call ProteusWidget.init(). React never touches the div's children, so the
 * widget's DOM and React don't fight.
 *
 * This is THE shop: browse, cart, checkout, accounts, pickup/delivery. Skinned
 * to the brand via the `#proteus_shop` rules in globals.css.
 * Recipe reverse-engineered from the live embed on thehighlifeny.com/shop.
 */
export const WIDGET_SRC = "https://cart.thehighlifeny.com/cart-widget.js.cfm?v=4";

/** Container used while running stock Proteus (data/proteus-stock.ts). */
const STOCK_CONTAINER_ID = "proteus_stock";

// The widget attaches a global; it's untyped.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ProteusWidget?: any;
  }
}

/**
 * `kiosk` turns on JSCart's OWN kiosk runtime (a module already inside the
 * widget, off by default): full-screen takeover, an inactivity timeout that
 * resets the cart for the next customer, a reset after each order, a PIN-gated
 * staff exit, bigger touch targets, and orders flagged `kiosk` in Proteus.
 * Used by /kiosk for the in-store tablets. Requires mode "full", which we
 * already pass. `kioskTimeout` is in MINUTES.
 */
export default function ProteusShop({
  kiosk = false,
  kioskTimeout = 3,
}: {
  kiosk?: boolean;
  kioskTimeout?: number;
} = {}) {
  const started = useRef(false);

  // The site sets `scroll-behavior: smooth` on <html> (for homepage anchor
  // jumps). On this page the widget lazy-loads dozens of product images, and
  // each reflow restarts the in-flight smooth-scroll animation — which makes the
  // page feel frozen / impossible to scroll. Force instant scrolling while the
  // shop is mounted, and restore on unmount.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    if (started.current) return; // guard React 18/19 StrictMode double-run
    started.current = true;

    // If a nav button sent us here from another page (?login=1 or ?cart=1),
    // open the widget's login/account or cart once it's actually loaded.
    const maybeOpenAction = () => {
      let params: URLSearchParams;
      try {
        params = new URLSearchParams(location.search);
      } catch {
        return;
      }
      const wantLogin = params.get("login") === "1";
      const wantCart = params.get("cart") === "1";
      if (!wantLogin && !wantCart) return;
      let tries = 0;
      const go = () => {
        const w = window.ProteusWidget;
        // wait until the widget has actually loaded (brands present) before
        // acting — calling too early silently no-ops.
        const ready = w && w.getBrands && w.getBrands().length > 0;
        if (ready) {
          if (wantCart && w.showCart) {
            w.showCart();
          } else if (wantLogin && w.showLoginModal) {
            if (w.isAuthenticated && w.isAuthenticated()) w.showAccount?.();
            else w.showLoginModal();
          }
          params.delete("login"); // don't reopen on refresh
          params.delete("cart");
          const qs = params.toString();
          history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
          return;
        }
        if (tries++ < 60) setTimeout(go, 150);
      };
      go();
    };

    const init = () => {
      if (!window.ProteusWidget) return;
      if (PROTEUS_STOCK) {
        // Stock: Proteus's own embed recipe and nothing else. Every other option is
        // left at JSCart's defaults — light theme, "Shop Products", their checkout
        // address, their sign-in screens, guest checkout as their server allows.
        // See data/proteus-stock.ts.
        document.documentElement.setAttribute("data-proteus-stock", "");
        window.ProteusWidget.init({
          client: "highlife",
          mode: "full",
          containerId: STOCK_CONTAINER_ID,
        });
        maybeOpenAction(); // keeps the site nav's Sign In / Cart buttons working
        return;
      }
      window.ProteusWidget.init({
        client: "highlife",
        mode: "full",
        containerId: "proteus_shop",
        showCategories: true,
        showSearch: true,
        showBrandFilter: true,
        showSort: true,
        theme: "dark", // brand skin lives in globals.css (#proteus_shop)
        headerTitle: "Shop The High Life",
        logoImage: "",
        // WHERE CHECKOUT GOES — differs on purpose between the website and the kiosk.
        //
        // Website: the High Life domain. Proteus's white-label host serves the same
        // cart, so the only thing that changes is the hostname in the address bar at
        // the moment someone is deciding whether to trust us with their details.
        //
        // Kiosk: the SAME host that issues the login token. Sign-in calls
        //     baseUrl + "/highlife/api_auth.cfm"  ->  cart.proteus420.com
        // and checkout posts that token to checkoutUrl + "/checkout_init.cfm". Sent to
        // a different host, kiosk customers were being asked to sign in a second time
        // on Proteus's checkout page. This is exactly what Proteus's own hosted kiosk
        // does — cart.proteus420.com/highlife/kiosk/index.cfm sets
        //     checkoutUrl: window.location.origin + pathname.replace(/\/kiosk.../, '')
        // which resolves to the same value as below, with the comment that a
        // different host means "the cookie is lost". It costs nothing here: a locked
        // tablet has no address bar, so the branded hostname buys nobody anything.
        //
        // ⚠️ The kiosk value keeps the /highlife client segment; the website's does
        // not. The white-label host serves at its ROOT (so /highlife 404s there),
        // while cart.proteus420.com serves under /highlife. Don't "tidy" them to match.
        //
        // ⚠️ Do NOT also set `baseUrl`. It looks like the obvious next step and it
        // takes the shop down. The widget builds API calls as
        //     baseUrl + "/" + client + "/api_cart_v2.cfm"
        // and the white-label host does not serve that path at all. So baseUrl stays
        // unset and keeps defaulting to cart.proteus420.com, on both surfaces.
        checkoutUrl: kiosk
          ? "https://cart.proteus420.com/highlife"
          : "https://cart.thehighlifeny.com",
        // Guest / anonymous checkout OFF — everywhere, kiosk and public site alike.
        // An unidentified order isn't something a licensed dispensary can take; every
        // order has to tie to a customer.
        //
        // This MUST be passed explicitly. JSCart's own default is anonCheckout:true,
        // so omitting it leaves guest checkout switched ON — which it silently was,
        // under a comment here that claimed the opposite.
        //
        // Client-side only: this removes the "Continue as Guest" button from the
        // checkout choice screen. checkout_init.cfm gates the actual guest order on
        // Proteus's own anonCheckout setting, so it needs turning off there too.
        anonCheckout: false,
        // Kiosk-only config. None of this changes how the public site behaves.
        //
        // quickCheckout: phone + birthdate. Nobody types an email and password
        //   standing at a tablet.
        // collapseCategories reclaims the fixed 240px category sidebar into a drawer.
        //   JSCart added it for exactly this case: on a portrait kiosk that sidebar
        //   costs a third of the width and squeezes the grid down a column. The
        //   horizontal category chips stay on screen, so navigation isn't lost.
        ...(kiosk
          ? {
              kiosk: true,
              kioskTimeout,
              quickCheckout: true,
              collapseCategories: true,
              // Skip JSCart’s own KIOSK SETUP dialog. Without this a tablet whose storage
              //   has been cleared greets the next CUSTOMER with a staff config form asking
              //   for shop type, timeout and an exit PIN. There is nothing to ask: this store
              //   has one location and pickup only (the locations API returns exactly that),
              //   so config.shopType is the answer and neither modal is needed.
              //   It also stops a customer tapping the location chip into a store picker.
              //
              //   Side effect worth knowing: that dialog was also the ONLY way to set the
              //   staff exit PIN — the widget exposes no config option for it — so kiosk mode
              //   can now be exited without one. Fine on a tablet locked to this URL with no
              //   address bar; it is not a customer-reachable control.
              //
              //   It also settles a conflict: the dialog wrote a per-device timeout that
              //   OVERRODE kioskTimeout here (kioskSettings.timeout || config.kioskTimeout).
              //   With no dialog nothing is written, so this prop is the single source.
              lockSelections: true,
            }
          : {}),
      });
      maybeOpenAction();
    };

    if (window.ProteusWidget) {
      init();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`);
    if (script) {
      script.addEventListener("load", init);
      return;
    }
    script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, []);

  if (PROTEUS_STOCK) {
    // A different id on purpose: every brand-skin rule in globals.css is scoped to
    // #proteus_shop, so a stock container matches none of them and nothing had to
    // be deleted. None of our patch components mount either.
    return <div id={STOCK_CONTAINER_ID} />;
  }

  return (
    <>
      {/* Both of these patch the widget's own DOM, so they live here and cover every
          route it runs on — /menu, /deals and /kiosk. */}
      {/* Repairs the registration config Proteus serves us: forces 21+, and reveals
          required fields their config hides (howcontact, which silently blocked every
          signup). Must mount before the widget script loads — see the component. */}
      <ProteusConfigFix />
      {/* Repairs mojibake in JSCart's copy (their source file is double-encoded). */}
      <ProteusTextFix />
      {/* Keeps the sign-in modal from closing on a retargeted click while typing. */}
      <AuthModalGuard />
      {/* Caps the quantity stepper at real stock. Silent — no count is shown. */}
      <ProteusStockLimit />
      {/* Corrects the 404 path JSCart uses for search suggestions. */}
      <ProteusSearchFix />
      {/* Kiosk: checkout opens straight on phone + birthday. The "Sign In or Quick
          Checkout?" screen is skipped — most customers here have a passwordless
          in-store account and cannot be expected to know which door is theirs. */}
      {kiosk && <KioskQuickAuth />}
      {/* TEMPORARY: records what Proteus's quick login returns and what leaves in
          the checkout POST, to settle the first-time-customer double sign-in.
          Silent — the panel only appears with ?diag=1. Comes out when we know. */}
      {kiosk && <KioskAuthTrace />}
      {/* Offers a way forward when someone registers an email that already exists in
          Proteus from an in-store visit. */}
      <AccountLinkPrompt />
      {/* Asks online shoppers to put their pickup time in Proteus's checkout Notes
          field — the only channel that carries one onto the real order. Off on the
          kiosk, where the shopper is already in the building. */}
      {!kiosk && <PickupTimeHint />}
      <div id="proteus_shop" className="proteus-full-container" />
    </>
  );
}
