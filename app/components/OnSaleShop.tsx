"use client";

import { useEffect, useRef, useState } from "react";
import ProteusShop from "./ProteusShop";

/**
 * The homepage's "On Sale Right Now" row, as REAL JSCart product tiles — the same
 * cards as the menu, with working Add buttons and quantity steppers.
 *
 * JSCart has no "just a row of products" mode (its modes are full / cart / badge),
 * so this mounts the full shop and globals.css (.onsale-shop) hides everything but
 * the product grid, turned into a horizontal scroller. /deals does the same thing
 * with the deals carousel.
 *
 * A full shop on a page that isn't the shop needs four guards:
 *
 *  1. LOADED LATE. The widget is ~585KB. It's only mounted once the section is
 *     within ~900px of the screen, so a visitor who never scrolls that far never
 *     downloads it.
 *
 *  2. IT MUST NOT SCROLL THE PAGE. JSCart's scrollToResults() drags the window to
 *     its product list after every filter change — including the on-sale filter
 *     applied here — which on the homepage would yank visitors down the page.
 *     window.scrollTo is wrapped to drop calls whose stack comes from
 *     scrollToResults (the widget is unminified; the name is stable). Every other
 *     scroll on the page is untouched.
 *
 *  3. THE HOMEPAGE'S OWN LINKS AREN'T SHOP STATES. The hero's "#deals" / "#shop"
 *     and the footer's "#top" fire popstate, and JSCart would read them as "no
 *     filters" and reset the row to its featured landing. A popstate listener
 *     registered BEFORE the widget's own swallows those — only hashes the widget
 *     wrote (they carry "view=") reach it. Next.js's router listener is
 *     registered at hydration, before this one, so it's unaffected. If a product
 *     pop-up is open when one of those Back steps lands, it's closed here, since
 *     the widget won't hear about it.
 *
 *  4. NO DEAD BACK STEP. showOnSale() ends in pushState(); on first load that
 *     would add a history entry, so Back would appear to do nothing. It's made a
 *     replace for that one call.
 *
 * It also sets data-hl-onsale-savings on <html> so ProteusSortFix orders this
 * on-sale list biggest saving first, as the row always has — Proteus has no such
 * sort. Only while this component is mounted.
 *
 * Checkout still requires JSCart's "powered by" footer to be visible (it refuses
 * otherwise), so the CSS leaves it in place.
 */

/** Hashes JSCart writes always carry a view — "#view=products&onsale=1". */
const WIDGET_HASH = /(^#|&)view=/;

export default function OnSaleShop() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // 1. Mount the shop only when the row is about to come on screen.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 2 + 3. Installed on mount — before the widget exists, so before its listeners.
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-hl-onsale-savings", "");

    const onPop = (e: PopStateEvent) => {
      if (WIDGET_HASH.test(location.hash)) return;
      e.stopImmediatePropagation();
      // Back from a product pop-up to one of the homepage's own anchors (e.g. the
      // shopper tapped "#deals", then a tile, then Back). The widget never sees
      // this step, so its pop-up would stay open — close it on its behalf. Found in
      // live testing; its close() swaps the address back without a history entry.
      if (document.getElementById("proteus-product-modal")) {
        window.ProteusWidget?.closeProductModal?.();
      }
    };
    window.addEventListener("popstate", onPop);

    const nativeScrollTo = window.scrollTo;
    const guarded = function (this: Window, ...args: unknown[]) {
      if (/scrollToResults/.test(new Error().stack || "")) return;
      return (nativeScrollTo as (...a: unknown[]) => void).apply(this, args);
    } as typeof window.scrollTo;
    window.scrollTo = guarded;

    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.scrollTo === guarded) window.scrollTo = nativeScrollTo;
      html.removeAttribute("data-hl-onsale-savings");
    };
  }, []);

  // Open the shop on "on sale" as soon as it has loaded.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    let tries = 0;

    const go = async () => {
      const w = window.ProteusWidget;
      const loaded =
        w &&
        typeof w.showOnSale === "function" &&
        typeof w.getBrands === "function" &&
        w.getBrands().length > 0 &&
        document.querySelector("#proteus_shop .proteus-layout, #proteus_shop .proteus-products-grid");
      if (!loaded) {
        if (!cancelled && tries++ < 120) setTimeout(go, 150);
        return;
      }
      // 4. showOnSale()'s pushState becomes a replace for this one call.
      const push = history.pushState;
      history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
        return history.replaceState.apply(this, args);
      };
      try {
        await w.showOnSale();
      } catch {
        /* leave whatever the widget rendered; the "View All On Sale" button still works */
      } finally {
        history.pushState = push;
      }
      if (!cancelled) setReady(true);
    };

    go();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  return (
    <div ref={hostRef} className={ready ? "onsale-shop is-ready" : "onsale-shop"} aria-busy={!ready}>
      {!ready && (
        <div className="onsale-shop-loading" aria-hidden="true">
          Loading what&rsquo;s on sale…
        </div>
      )}
      {mounted && <ProteusShop />}
    </div>
  );
}
