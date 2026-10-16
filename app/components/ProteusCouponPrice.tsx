"use client";

import { useEffect } from "react";

/**
 * Shows what a percent-off coupon actually brings a product down to, on the
 * product card, instead of leaving the customer to find out at checkout.
 *
 * Proteus attaches coupons to products, but JSCart's card only ever prints the
 * shelf price. A markdown typed onto the SKU shows as a sale price; a 30% off
 * COUPON shows as nothing at all until the checkout screen applies it. So "ALL
 * FIND PRODUCTS 30% OFF" was invisible on a $186 eighth-ounce.
 *
 * ── WHERE THE NUMBER COMES FROM ──────────────────────────────────────────────
 * Not from parsing the badge. The products response only carries a coupon's
 * id and a display string ("30% OFF", "B1G1", "$38 EA"), but `action=deals`
 * carries the same coupons STRUCTURED:
 *     { id: 176, type: "percent", amount: 30, name: "DANK 30% OFF 5PK PRE ROLL" }
 * So the coupon id on the product joins to the deal, and `amount` is the real
 * figure the store typed into Proteus. Types seen in use: percent, bogx, and
 * makeamount.
 *
 * ⚠️ ONLY `type === "percent"` IS TOUCHED. A B1G1 or a "2 for $50" has no single
 * adjusted unit price — showing one would be a lie — so those are left alone.
 *
 * ── THE THREE RULES THAT KEEP IT HONEST ──────────────────────────────────────
 *  1. NOTHING IS SHOWN IF THE PRODUCT ALREADY HAS A SALE PRICE. Across the whole
 *     shop exactly three products had both, and in all three the sale price was
 *     already the coupon discount (an $11 pre-roll at $8.80 is already the 20%).
 *     Applying the percent again would quote a price nobody will honour.
 *  2. Member pricing (hasCustomerPrice) is left alone — that's its own price.
 *  3. It says AT CHECKOUT, out loud. The cart genuinely still shows full price:
 *     Proteus's own validate_cart reprices a $186 item back to $186, and the
 *     coupon is only applied on the checkout screen. Printing a bare lower
 *     number would have the customer meet the full price in the cart and assume
 *     the site is broken. Naming when it comes off is the difference between a
 *     promise and a surprise.
 */

type Deal = { id: number; type?: string; amount?: number; name?: string };
type Row = { price: number; hasSale: boolean; member: boolean; couponIds: number[] };
type PatchedFetch = typeof fetch & { __hlCouponPricePatched?: true };

const MARK = "hl-cpnprice";
/** Marks a price block we have rewritten, and the span we struck through. */
const DONE = "data-hl-cpn";
const WAS_PRICE = "data-hl-cpn-shelf";
const DEALS_URL =
  "https://cart.proteus420.com/highlife/api_cart_v2.cfm?action=deals&accountId=1204&locationId=1";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function ProteusCouponPrice() {
  useEffect(() => {
    /** coupon id -> percent off (only percent coupons land here) */
    const percentById = new Map<number, number>();
    /** product id -> what we need to decide and to compute */
    const rows = new Map<number, Row>();

    const cardId = (card: Element): number | null => {
      const nav = card.querySelector('[onclick*="_cardNav"]');
      const m = nav?.getAttribute("onclick")?.match(/_cardNav\(event,\s*(\d+)\)/);
      return m ? Number(m[1]) : null;
    };

    /** Put a card back the way JSCart drew it. */
    const undo = (host: Element) => {
      host.querySelector(`.${MARK}`)?.remove();
      host.querySelectorAll(`[${WAS_PRICE}]`).forEach((el) => {
        el.classList.remove("proteus-price-original");
        el.removeAttribute(WAS_PRICE);
      });
      host.removeAttribute(DONE);
    };

    const paint = () => {
      const shop = document.getElementById("proteus_shop");
      if (!shop) return;
      shop.querySelectorAll(".proteus-product-card").forEach((card) => {
        const host = card.querySelector(".proteus-product-price-value");
        if (!host) return;

        const id = cardId(card);
        const row = id === null ? undefined : rows.get(id);
        const pct = row?.couponIds.map((c) => percentById.get(c)).find((v) => v != null);

        // Rules 1 and 2, plus tiered products: "View Options" means there is no
        // one price on the card to take a percentage of.
        const tiered = !!host.querySelector(".proteus-price-view-options");
        if (!row || pct == null || row.hasSale || row.member || !(row.price > 0) || tiered) {
          if (host.hasAttribute(DONE)) undo(host);
          return;
        }

        if (host.getAttribute(DONE) === String(pct)) return; // already drawn
        undo(host); // a different percent: rebuild from clean

        // Strike the shelf price and put the coupon price beside it, using
        // JSCart's OWN classes — .proteus-price-original and .proteus-price-sale
        // — so this is identical to a real markdown rather than a lookalike.
        const shelf = [...host.children].find(
          (el) => !el.classList.contains(MARK) && /\$/.test(el.textContent ?? ""),
        );
        if (!shelf) return;
        shelf.classList.add("proteus-price-original");
        shelf.setAttribute(WAS_PRICE, "");

        const sale = document.createElement("span");
        sale.className = `proteus-price-sale ${MARK}`;
        sale.textContent = money(row.price * (1 - pct / 100));
        host.appendChild(sale);
        host.setAttribute(DONE, String(pct));
      });
    };

    // The structured coupon figures. Fetched here rather than waiting for the
    // widget to ask, so the price can appear on the first grid it draws.
    let cancelled = false;
    fetch(DEALS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list: Deal[] = Array.isArray(data) ? data : (data?.deals ?? []);
        for (const d of list) {
          const amount = Number(d?.amount);
          if (d?.type === "percent" && Number.isFinite(amount) && amount > 0 && amount < 100) {
            percentById.set(Number(d.id), amount);
          }
        }
        paint();
      })
      .catch(() => {
        /* no figures, no claim: the cards simply stay as they are */
      });

    // Watch the products responses for which product carries which coupon, and
    // for the two things that veto a claim: a sale price and member pricing.
    const original = window.fetch as PatchedFetch;
    let patched: PatchedFetch | null = null;
    if (!original.__hlCouponPricePatched) {
      patched = ((input: RequestInfo | URL, init?: RequestInit) => {
        const out = original(input, init);
        try {
          const url =
            typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          if (/api_cart_v2\.cfm/i.test(url) && /action=products?(&|$)/i.test(url)) {
            out
              .then((res) => (res.ok ? res.clone().json() : null))
              .then((data) => {
                const list = Array.isArray(data?.products)
                  ? data.products
                  : data?.product
                    ? [data.product]
                    : [];
                for (const p of list) {
                  const id = Number(p?.id);
                  if (!Number.isFinite(id)) continue;
                  const sale = Number(p?.salePrice);
                  rows.set(id, {
                    price: Number(p?.price),
                    hasSale: Number.isFinite(sale) && sale > 0,
                    member: p?.hasCustomerPrice === true,
                    couponIds: Array.isArray(p?.coupons)
                      ? p.coupons.map((c: { id?: number }) => Number(c?.id))
                      : [],
                  });
                }
                paint();
              })
              .catch(() => {
                /* a price note must never be why the menu fails to load */
              });
          }
        } catch {
          /* ditto */
        }
        return out;
      }) as PatchedFetch;
      patched.__hlCouponPricePatched = true;
      window.fetch = patched;
    }

    // The widget rebuilds its grid on every filter, sort and page.
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
      cancelled = true;
      observer?.disconnect();
      if (patched && window.fetch === patched) window.fetch = original;
      document
        .querySelectorAll(`[${DONE}]`)
        .forEach((el) => undo(el));
    };
  }, []);

  return null;
}
