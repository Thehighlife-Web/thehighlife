"use client";

import { useEffect } from "react";

/**
 * Puts a "20% OFF COUPON" tag on products that have a coupon attached.
 *
 * Proteus attaches coupons to products (Curaleaf 20%, a B1G1, and so on) and the
 * products API returns them on each product — but JSCart only draws a coupon
 * banner when the store's "show coupons on products" setting is ON, and ours is
 * OFF (the products response carries no showProductCoupons flag, so the widget
 * leaves it false). The result: 49 of 286 Flower products carry a coupon today
 * and the card says nothing about it — just the ordinary price.
 *
 * So the tag is added here, from the coupon data the API already sends:
 *
 *  1. Wrap fetch and read the products responses as they pass (same pattern as
 *     ProteusSearchFix / ProteusSortFix, with its own remount guard). The clone
 *     is what's read, so the widget still gets its body.
 *  2. Remember productId -> the coupon's own badge wording ("20% OFF", "B1G1").
 *  3. Stamp a tag onto each matching card, re-running whenever the widget
 *     re-renders its grid (it rebuilds the DOM on every filter, sort and page).
 *
 * The wording is the store's, never invented here: it's whatever Proteus returns
 * as the coupon's displayText, with the word COUPON after it. A product with no
 * coupon gets nothing, and if a coupon is removed in Proteus the tag goes with it
 * on the next load.
 *
 * ⚠️ This says a coupon EXISTS on the product; Proteus decides whether it applies
 * at checkout. If the store ever runs coupons that need a code typed in, this
 * wording would need revisiting.
 */

type PatchedFetch = typeof fetch & { __hlCouponPatched?: true };

const MARK = "hl-coupon-tag";

/** "20% OFF" -> "20% OFF COUPON". The store's wording, not ours. */
const label = (badge: string) => `${badge} coupon`.toUpperCase();

export default function ProteusCouponTag() {
  useEffect(() => {
    /** productId -> coupon badge text */
    const byId = new Map<number, string>();

    const cardId = (card: Element): number | null => {
      const nav = card.querySelector('[onclick*="_cardNav"]');
      const m = nav?.getAttribute("onclick")?.match(/_cardNav\(event,\s*(\d+)\)/);
      return m ? Number(m[1]) : null;
    };

    const paint = () => {
      const shop = document.getElementById("proteus_shop");
      if (!shop) return;
      shop.querySelectorAll(".proteus-product-card").forEach((card) => {
        const id = cardId(card);
        const badge = id === null ? undefined : byId.get(id);
        const host = card.querySelector(".proteus-product-image-wrapper") ?? card;
        const existing = host.querySelector(`.${MARK}`);

        if (!badge) {
          existing?.remove(); // coupon ended, or this card isn't in the data (yet)
          return;
        }
        if (existing) {
          if (existing.textContent !== label(badge)) existing.textContent = label(badge);
          return;
        }
        const tag = document.createElement("span");
        tag.className = MARK;
        tag.textContent = label(badge);
        host.appendChild(tag);
      });
    };

    // 1 + 2. Watch the products responses go past and remember their coupons.
    const original = window.fetch as PatchedFetch;
    let patched: PatchedFetch | null = null;

    if (!original.__hlCouponPatched) {
      patched = ((input: RequestInfo | URL, init?: RequestInit) => {
        const out = original(input, init);
        try {
          const url =
            typeof input === "string"
              ? input
              : input instanceof Request
                ? input.url
                : String(input);
          if (/api_cart_v2\.cfm/i.test(url) && /action=products?(&|$)/i.test(url)) {
            out
              .then((res) => (res.ok ? res.clone().json() : null))
              .then((data) => {
                const list = Array.isArray(data?.products)
                  ? data.products
                  : data?.product
                    ? [data.product]
                    : [];
                if (!list.length) return;
                for (const p of list) {
                  const badge = (p?.coupons?.[0]?.displayText || "").trim();
                  const id = Number(p?.id);
                  if (!Number.isFinite(id)) continue;
                  if (badge) byId.set(id, badge);
                  else byId.delete(id);
                }
                paint();
              })
              .catch(() => {
                /* a tag must never be why the menu fails to load */
              });
          }
        } catch {
          /* ditto */
        }
        return out;
      }) as PatchedFetch;
      patched.__hlCouponPatched = true;
      window.fetch = patched;
    }

    // 3. The widget rebuilds its grid on every filter, sort and page, so re-stamp
    //    whenever it does. Painting is idempotent, so the observer settles after
    //    the pass that follows its own insertions.
    let observer: MutationObserver | null = null;
    let tries = 0;
    const watch = () => {
      const shop = document.getElementById("proteus_shop");
      if (!shop) {
        if (tries++ < 120) setTimeout(watch, 250);
        return;
      }
      observer = new MutationObserver(paint);
      observer.observe(shop, { childList: true, subtree: true });
      paint();
    };
    watch();

    return () => {
      observer?.disconnect();
      if (patched && window.fetch === patched) window.fetch = original;
      document.querySelectorAll(`.${MARK}`).forEach((el) => el.remove());
    };
  }, []);

  return null;
}
