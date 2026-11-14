"use client";

import { useEffect, useRef, useState } from "react";
import type { SaleItem, SaleTab } from "@/lib/onsale";
import { money } from "./ProductUI";
import ProteusShop from "./ProteusShop";

/**
 * The homepage's On Sale shelf: an "All" tab, then one tab per category with
 * anything discounted, and a horizontal row of sale cards under them.
 *
 * Everything arrives from the server already sorted and filtered (lib/onsale.ts),
 * so switching tabs is local state — no network.
 *
 * ── ADD TO CART, ON THIS PAGE ────────────────────────────────────────────────
 * Each card's button puts the item straight into the real Proteus cart with
 * ProteusWidget.add() — the same call JSCart's own Add button makes — and the
 * customer stays where they are. (Cards used to open the product on /menu; Elijah
 * didn't want the page switching.)
 *
 * That needs the widget on the homepage, but only its CART: ProteusShop cartOnly
 * runs JSCart's "badge" mode — cart, sign-in, checkout, no product grid — about
 * 300KB, mounted as the shelf comes near the screen (or on the first tap, if
 * someone gets there first). The full shop here used to pull ~34MB of deal
 * artwork for a section it kept hidden; this doesn't.
 *
 * Once the cart is on the page, the header's Cart and Sign In buttons work in
 * place too — Nav already uses the widget whenever it's present.
 */

type Shown = { label: string; cat: number | null; items: SaleItem[] };

type AddState = "adding" | "added" | "max" | "error";

/** How long to wait for the cart script before telling the customer to retry. */
const CART_WAIT_MS = 12000;

/**
 * Where "View all" goes. A category link shows the WHOLE category, not just its
 * sale items — Proteus ignores onsale=1 once a category is set — so the label
 * says "Shop All Flower", not "All Flower On Sale". The link says what it does.
 */
const ctaFor = (t: Shown) =>
  t.cat == null
    ? { href: "/menu#view=products&onsale=1", label: "View All On Sale" }
    : { href: `/menu#view=products&cat=${t.cat}`, label: `Shop All ${t.label}` };

/** Resolves with the widget once its cart is loaded (see __hlCartReady), or null on timeout. */
function cartReady(): Promise<NonNullable<Window["ProteusWidget"]> | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const w = window.ProteusWidget;
      if (window.__hlCartReady && w && typeof w.add === "function") return resolve(w);
      if (Date.now() - started > CART_WAIT_MS) return resolve(null);
      setTimeout(check, 100);
    };
    check();
  });
}

const LABEL: Record<AddState | "idle", string> = {
  idle: "Add to Cart",
  adding: "Adding…",
  added: "✓ Added",
  max: "All in your cart",
  error: "Try again",
};

function SaleCard({
  item,
  state,
  onAdd,
}: {
  item: SaleItem;
  state: AddState | undefined;
  onAdd: (item: SaleItem) => void;
}) {
  return (
    <article className="prod salecard">
      <div className="prod-img">
        {item.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <div className="prod-noimg" aria-hidden="true" />
        )}
        <span className="prod-sale salecard-pct">{item.pct}% Off</span>
      </div>
      <div className="prod-body">
        {item.brand && <div className="prod-brand">{item.brand}</div>}
        <h3 className="prod-name">{item.name}</h3>
      </div>
      <div className="prod-foot salecard-foot">
        <div className="prod-price">
          <span className="was">
            <span className="sr-only">Was </span>
            {money(item.was)}
          </span>
          <span className="now">
            <span className="sr-only">now </span>
            {money(item.now)}
          </span>
        </div>
        {/* Proteus's cart shows the shelf price until checkout applies the
            coupon. Saying so here is what stops "the site lied to me". */}
        {item.atCheckout && <p className="salecard-note">Deal price — applied at checkout</p>}
        <button
          type="button"
          className={`salecard-add${state ? ` is-${state}` : ""}`}
          onClick={() => onAdd(item)}
          disabled={state === "adding"}
          aria-label={state ? undefined : `Add ${item.name} to cart`}
        >
          <span aria-live="polite">{LABEL[state ?? "idle"]}</span>
        </button>
      </div>
    </article>
  );
}

export default function SaleShelf({ all, tabs }: { all: SaleItem[]; tabs: SaleTab[] }) {
  const shown: Shown[] = [{ label: "All", cat: null, items: all }, ...tabs];
  const [active, setActive] = useState(0);
  const current = shown[active] ?? shown[0];
  const cta = ctaFor(current);

  // Mount the cart as the shelf approaches the screen, so it's usually ready
  // before the first tap. A tap before then mounts it too (see add()).
  const [wantCart, setWantCart] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setWantCart(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [states, setStates] = useState<Record<string, AddState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setState = (id: string, s: AddState | null, clearAfter?: number) => {
    clearTimeout(timers.current[id]);
    setStates((prev) => {
      const next = { ...prev };
      if (s) next[id] = s;
      else delete next[id];
      return next;
    });
    if (s && clearAfter) timers.current[id] = setTimeout(() => setState(id, null), clearAfter);
  };
  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const add = async (item: SaleItem) => {
    setWantCart(true);
    setState(item.id, "adding");
    const w = await cartReady();
    if (!w) return setState(item.id, "error", 4000);

    // JSCart's own Add stops at the shelf count, but only for products it has
    // loaded — and in cart-only mode it has loaded none. So check here, the same way.
    const id = Number(item.id);
    let inCart = 0;
    try {
      const lines: { id?: number | string; qty?: number }[] = w.getCart?.()?.items ?? [];
      inCart = lines.filter((l) => Number(l.id) === id).reduce((n, l) => n + (Number(l.qty) || 0), 0);
    } catch {}
    if (item.inventory > 0 && inCart >= item.inventory) return setState(item.id, "max", 3000);

    try {
      // Exactly what JSCart's own Add button passes: id (a number — it matches cart
      // lines with ===), name, and its cart price.
      w.add(id, item.name, item.cartPrice);
      setState(item.id, "added", 2500);
    } catch {
      setState(item.id, "error", 4000);
    }
  };

  return (
    <div ref={rootRef}>
      <div className="liverow-head">
        <div className="liverow-tabs" role="tablist" aria-label="On sale by category">
          {shown.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              id={`saletab-${i}`}
              aria-selected={i === active}
              aria-controls="salerow"
              className={i === active ? "liverow-tab on" : "liverow-tab"}
              onClick={(e) => {
                setActive(i);
                // On phones the chips scroll sideways; bring the chosen one into
                // view without moving the page up or down.
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <a className="btn ghost onsale-all" href={cta.href}>
          {cta.label} →
        </a>
      </div>

      {/* Keyed on the tab, so switching starts the row back at its first card
          instead of halfway along the previous tab's scroll. */}
      <div
        key={current.label}
        className="salerow"
        id="salerow"
        role="tabpanel"
        aria-labelledby={`saletab-${active}`}
      >
        {current.items.map((item) => (
          <SaleCard key={item.id} item={item} state={states[item.id]} onAdd={add} />
        ))}
      </div>

      {wantCart && <ProteusShop cartOnly />}
    </div>
  );
}
