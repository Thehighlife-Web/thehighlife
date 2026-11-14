"use client";

import { useState } from "react";
import type { SaleItem, SaleTab } from "@/lib/onsale";
import { money } from "./ProductUI";

/**
 * The homepage's On Sale shelf: an "All" tab, then one tab per category with
 * anything discounted, and a horizontal row of sale cards under them.
 *
 * Everything arrives from the server already sorted and filtered (lib/onsale.ts),
 * so switching tabs is local state — no network, no JSCart. That's the point of
 * it: this row used to embed the whole JSCart shop and steer it, which couldn't
 * show "on sale in this category" at all, and loaded ~650KB of widget onto the
 * homepage to do the rest.
 *
 * A card isn't a cart button. It opens that product in the shop, where the
 * customer picks a size and adds it — the widget owns the cart, and a homepage
 * card can't add to it without loading the widget here again.
 */

type Shown = { label: string; cat: number | null; items: SaleItem[] };

/**
 * ⚠️ `view=product` — SINGULAR. JSCart's restoreFromHash only opens the product
 * window for `view === 'product' && pid`; with `view=products` it reads the pid,
 * ignores it, and shows the general list. That shipped in the first draft of this
 * and was only caught by clicking a card through to /menu.
 */
const pdp = (id: string) => `/menu#view=product&pid=${encodeURIComponent(id)}`;

/**
 * Where "View all" goes. A category link shows the WHOLE category, not just its
 * sale items — Proteus ignores onsale=1 once a category is set — so the label
 * says "Shop All Flower", not "All Flower On Sale". The link says what it does.
 */
const ctaFor = (t: Shown) =>
  t.cat == null
    ? { href: "/menu#view=products&onsale=1", label: "View All On Sale" }
    : { href: `/menu#view=products&cat=${t.cat}`, label: `Shop All ${t.label}` };

function SaleCard({ item }: { item: SaleItem }) {
  return (
    <a className="prod is-clickable salecard" href={pdp(item.id)}>
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
      <div className="prod-foot">
        <div>
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
        </div>
      </div>
    </a>
  );
}

export default function SaleShelf({ all, tabs }: { all: SaleItem[]; tabs: SaleTab[] }) {
  const shown: Shown[] = [{ label: "All", cat: null, items: all }, ...tabs];
  const [active, setActive] = useState(0);
  const current = shown[active] ?? shown[0];
  const cta = ctaFor(current);

  return (
    <>
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
          <SaleCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
