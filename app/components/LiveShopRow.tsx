"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { liveRowTabs, type LiveRowTab } from "@/data/site";
import ProteusShop from "./ProteusShop";

/**
 * The homepage's live product row: REAL JSCart tiles — the same cards as the menu,
 * with working Add buttons and quantity steppers — with tabs over them for what to
 * show (On Sale, a category, Top Sellers; see liveRowTabs in data/site.ts).
 *
 * ── WHY TABS AND NOT SEVERAL ROWS ────────────────────────────────────────────
 * JSCart runs ONCE per page: window.ProteusWidget is a single instance with a
 * single container. So "a row of Flower AND a row of Edibles AND a row of top
 * sellers", the way a Dutchie site stacks carousels, isn't available. One shop
 * driven by tabs is the same merchandising with tiles that can actually add to
 * the cart, which those carousels can't.
 *
 * Each tab drives the shop through its own public controls:
 *   On Sale    showOnSale()                  — biggest saving first (ProteusSortFix)
 *   A category filterByCategory(cat)         — Best Sellers order
 *   Top Sellers filterByCategory('') + popular
 * filterByCategory keeps whatever sort is set, so sortBy('popular') is only sent
 * once, the first time a non-sale tab is opened.
 *
 * ── FOUR GUARDS FOR A FULL SHOP ON A PAGE THAT ISN'T THE SHOP ────────────────
 *
 *  1. LOADED LATE. The widget is ~585KB. It's only mounted once the section is
 *     within ~900px of the screen, so a visitor who never scrolls that far never
 *     downloads it.
 *
 *  2. IT MUST NOT SCROLL THE PAGE. JSCart's scrollToResults() drags the window to
 *     its product list after every filter change — that's every tab tap here —
 *     which on the homepage would yank visitors down the page. window.scrollTo is
 *     wrapped to drop calls whose stack comes from scrollToResults (the widget is
 *     unminified; the name is stable). Every other scroll is untouched.
 *
 *  3. THE HOMEPAGE'S OWN LINKS AREN'T SHOP STATES. The hero's "#deals" / "#shop"
 *     and the footer's "#top" fire popstate, and JSCart would read them as "no
 *     filters" and reset the row. A popstate listener registered BEFORE the
 *     widget's swallows those — only hashes the widget wrote (they carry "view=")
 *     reach it. Next.js's router listener is registered at hydration, before this
 *     one, so it's unaffected. If a product pop-up is open when one of those Back
 *     steps lands, it's closed here, since the widget won't hear about it.
 *
 *  4. NO DEAD BACK STEPS. showOnSale/filterByCategory/sortBy each end in
 *     pushState(); without this every tab tap would add a Back step that appears
 *     to do nothing. They're made replaces for the duration of each call.
 *
 * It also sets data-hl-onsale-savings on <html> so ProteusSortFix orders the
 * on-sale tab biggest saving first, which Proteus has no sort for. Only while
 * this component is mounted, and it only affects on-sale requests.
 *
 * Checkout still requires JSCart's "powered by" footer to be visible (it refuses
 * otherwise), so the CSS leaves it in place.
 */

/** Hashes JSCart writes always carry a view — "#view=products&onsale=1". */
const WIDGET_HASH = /(^#|&)view=/;

const tabHref = (t: LiveRowTab) =>
  t.key === "onsale"
    ? "/menu#view=products&onsale=1"
    : t.key === "category"
      ? `/menu#view=products&cat=${t.cat}`
      : "/menu#view=products&sort=popular";

const tabCta = (t: LiveRowTab) =>
  t.key === "onsale" ? "View All On Sale" : t.key === "top" ? "View All Top Sellers" : `View All ${t.label}`;

export default function LiveShopRow({ hasOnSale }: { hasOnSale: boolean }) {
  // Nothing on sale today: drop that tab rather than open on an empty row.
  const tabs = hasOnSale ? liveRowTabs : liveRowTabs.filter((t) => t.key !== "onsale");

  const hostRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const sortedByPopular = useRef(false);

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

  /** 4. Point the shop at one tab, without leaving Back steps behind. */
  const apply = useCallback(async (tab: LiveRowTab) => {
    const w = window.ProteusWidget;
    if (!w) return;
    const push = history.pushState;
    history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      return history.replaceState.apply(this, args);
    };
    try {
      if (tab.key === "onsale") {
        await w.showOnSale();
      } else {
        if (!sortedByPopular.current) {
          await w.sortBy?.("popular");
          sortedByPopular.current = true;
        }
        await w.filterByCategory?.(tab.key === "category" ? tab.cat : "");
      }
    } catch {
      /* leave whatever the widget rendered; the "View All" link still works */
    } finally {
      history.pushState = push;
    }
  }, []);

  // Open the first tab as soon as the shop has loaded.
  useEffect(() => {
    if (!mounted || !tabs.length) return;
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
      await apply(tabs[0]);
      if (!cancelled) setReady(true);
    };

    go();
    return () => {
      cancelled = true;
    };
  }, [mounted, tabs, apply]);

  const pick = async (i: number) => {
    if (i === active || busy) return;
    setActive(i);
    // On phones the chips are one scrolling line, so the chosen one can sit off
    // screen. Bring it into view by moving the STRIP's own scroll — scrollIntoView
    // would move the page as well.
    const strip = tabsRef.current;
    const chip = strip?.children[i] as HTMLElement | undefined;
    if (strip && chip) {
      strip.scrollTo({
        left: Math.max(0, chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2),
        behavior: "smooth",
      });
    }
    setBusy(true);
    await apply(tabs[i]);
    setBusy(false);
  };

  const current = tabs[active];

  return (
    <>
      <div className="liverow-head">
        <div className="liverow-tabs" role="tablist" aria-label="What to show" ref={tabsRef}>
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={i === active ? "liverow-tab on" : "liverow-tab"}
              onClick={() => pick(i)}
              disabled={!ready}
            >
              {t.label}
            </button>
          ))}
        </div>

        {current && (
          <a className="btn ghost onsale-all" href={tabHref(current)}>
            {tabCta(current)} →
          </a>
        )}
      </div>

      <div
        ref={hostRef}
        className={ready ? "onsale-shop is-ready" : "onsale-shop"}
        aria-busy={!ready || busy}
      >
        {!ready && (
          <div className="onsale-shop-loading" aria-hidden="true">
            Loading the shelf…
          </div>
        )}
        {mounted && <ProteusShop />}
      </div>
    </>
  );
}
