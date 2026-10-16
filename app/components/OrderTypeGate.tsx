"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { OrderType } from "@/lib/orderTypes";

/**
 * "How would you like to shop?" — asked once, right after the 21+ gate, before
 * anyone starts shopping.
 *
 * ── WHY THIS EXISTS WHEN JSCART ALREADY ASKS ─────────────────────────────────
 * JSCart raises its own shop-type dialog, but only when the cart widget starts.
 * That's fine on /menu, where the widget loads with the page — and bad on the
 * homepage, where the widget is deliberately lazy and doesn't start until the
 * shopper has scrolled down to the live shelf. The question then lands in the
 * middle of browsing, over the products, as a full-screen box they have to clear
 * before carrying on.
 *
 * Loading the widget early just to get the question would mean 600KB of script
 * on every page. This asks the same question in about 3KB, in the site's own
 * voice, and writes the answer where JSCart looks for it — so JSCart never has
 * to ask.
 *
 * ── HOW THE ANSWER REACHES JSCART ────────────────────────────────────────────
 * Two ways, because the widget may not have loaded yet:
 *   1. localStorage["proteus_shoptype_highlife"] — the key its own
 *      getShopTypeStorageKey() builds ('proteus_shoptype_' + client). It reads
 *      this at start-up and validates it against the location's options, so a
 *      stale or switched-off choice is corrected by the widget, not trusted.
 *   2. ProteusWidget.setShopType(token) when it IS already running, which also
 *      saves, closes its own dialog and re-renders the header.
 * The tokens come from lib/orderTypes and are JSCart's own spelling.
 *
 * ── THE ONE RACE WORTH KNOWING ───────────────────────────────────────────────
 * On /menu the widget starts while this is still open, finds nothing stored and
 * opens ITS dialog too — two boxes at once. So while this is unanswered, <html>
 * carries data-hl-shoptype-pending, and one rule in globals.css hides
 * #proteus-shoptype-modal. Answering removes the attribute and calls
 * setShopType, which closes theirs anyway.
 *
 * Not on /kiosk or /signage: those are in-store screens. The kiosk is pinned to
 * pickup in ProteusShop, and asking a customer standing at the counter how they
 * would like to shop is nonsense.
 */

/** JSCart's own key. The widget reads this, so it stays in localStorage. */
const STORAGE_KEY = "proteus_shoptype_highlife";
/**
 * Whether this TAB has been asked. Separate from the answer on purpose: the
 * widget needs the choice to persist, but the question should follow the 21+
 * gate, which is now asked once per tab. Without this, a returning visitor was
 * never asked again — which on a desktop meant never.
 */
const ASKED_KEY = "hl_shoptype_asked";
const PENDING_ATTR = "data-hl-shoptype-pending";

type WidgetWindow = Window & {
  ProteusWidget?: { setShopType?: (t: string) => void };
};

export default function OrderTypeGate({ options }: { options: OrderType[] }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const firstRef = useRef<HTMLButtonElement>(null);

  /** Has this tab already been asked? */
  const askedHere = useCallback(() => {
    try {
      return sessionStorage.getItem(ASKED_KEY) === "1";
    } catch {
      return false; // private mode: ask, which is the harmless way round
    }
  }, []);

  useEffect(() => {
    if (path.startsWith("/kiosk") || path.startsWith("/signage")) return;
    // Nothing to ask when the shop only does one thing.
    if (options.length < 2) return;
    if (askedHere()) return;

    const html = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const show = () => {
      timer = setTimeout(() => {
        html.setAttribute(PENDING_ATTR, "");
        setOpen(true);
      }, 450);
    };

    // After the 21+ gate, never over it — the gate is the legal control and has
    // to be answered first. It sets data-age="ok" on <html>; on a first visit
    // accepting it reloads the page, so usually the attribute is already there.
    if (html.getAttribute("data-age") === "ok") {
      show();
      return () => clearTimeout(timer);
    }
    const mo = new MutationObserver(() => {
      if (html.getAttribute("data-age") === "ok") {
        mo.disconnect();
        show();
      }
    });
    mo.observe(html, { attributes: true, attributeFilter: ["data-age"] });
    return () => {
      mo.disconnect();
      clearTimeout(timer);
    };
  }, [path, options.length, askedHere]);

  // Hold the page still behind it and put the keyboard on the first choice.
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("modal-open");
    firstRef.current?.focus();
    return () => document.documentElement.classList.remove("modal-open");
  }, [open]);

  const pick = (token: string) => {
    try {
      // The answer persists — the widget reads it on every page and carries it
      // to checkout.
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* private mode: the widget will ask in its own time */
    }
    try {
      // The ASKING is per tab, so this tab stops asking but the next one will.
      sessionStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* private mode: it may ask again on the next page; harmless */
    }
    (window as WidgetWindow).ProteusWidget?.setShopType?.(token);
    document.documentElement.removeAttribute(PENDING_ATTR);
    setOpen(false);
  };

  if (!open) return null;

  return (
    // No backdrop click and no close button on purpose: this is a question with
    // no sensible default. Picking wrong would send someone to the wrong counter
    // — or have a driver turn up — so it waits to be answered.
    <div className="modal-back" role="presentation">
      <div className="ordertype" role="dialog" aria-modal="true" aria-labelledby="ordertype-title">
        <h2 className="ordertype-title" id="ordertype-title">
          How would you like to shop?
        </h2>
        <p className="ordertype-lead">You can change this at checkout.</p>

        <div className="ordertype-list">
          {options.map((o, i) => (
            <button
              key={o.token}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              className="ordertype-option"
              onClick={() => pick(o.token)}
            >
              <span className="ordertype-label">{o.label}</span>
              <span className="ordertype-blurb">{o.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
