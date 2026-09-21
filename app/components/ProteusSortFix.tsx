"use client";

import { useEffect } from "react";
import { FIXED_SORTS, sortProducts } from "@/lib/sortProducts";

/**
 * Makes the menu's "Price" and "Name" sort options actually sort.
 *
 * JSCart doesn't sort anything itself: picking "Price: Low to High" or "Name A-Z"
 * sends `sortby=price_asc|price_desc|name|name_desc` to Proteus's products API
 * (older builds sent `price`; see FIXED_SORTS) and shows whatever order comes
 * back. "Name A-Z" is also the DEFAULT, so this covers the list everyone lands
 * on, not just the dropdown. That order is wrong. Measured live on
 * 2026-09-21 with the exact request the widget makes (limit=20, locationId,
 * accountId): Flower sorted by price had 38 items out of place, by name 18; the
 * All view sorted "Name A-Z" had 33 of 71 out of place and opened on "NoiZey",
 * "PAX", "Heavy Hitters", "Dank".
 *
 * So the order is corrected on the way in: wrap fetch, and for those four sorts
 * re-sort the `products` array (lib/sortProducts.ts) before the widget sees it.
 *
 * ── WHY RE-SORTING THE ONE RESPONSE IS ENOUGH ────────────────────────────────
 * This API doesn't really page. A category request returns the WHOLE category in
 * one response (it ignores `limit`), and the reply carries no `pagination` block,
 * so the widget treats it as a single page and never asks for page 2. Re-sorting
 * that one response therefore gives the correct order across everything shown,
 * not just within a page. The "All" view is one short list from Proteus to begin
 * with; this orders it.
 *
 * Every other sort (weight, newest, best sellers, on sale, THC) passes through
 * untouched, as does anything that isn't the products call. If the response
 * isn't the JSON we expect, Proteus's own response is handed back unchanged.
 * Same wrapping pattern as ProteusSearchFix, with its own remount guard.
 *
 * This is Proteus's bug and worth reporting.
 */

type PatchedFetch = typeof fetch & { __hlSortPatched?: true };

function sortOf(input: RequestInfo | URL): string | null {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : "";
    const url = new URL(raw, location.href);
    if (!/\/api_cart_v2\.cfm$/i.test(url.pathname)) return null;
    if (url.searchParams.get("action") !== "products") return null;
    const sortby = url.searchParams.get("sortby");
    return sortby && FIXED_SORTS.has(sortby) ? sortby : null;
  } catch {
    return null;
  }
}

export default function ProteusSortFix() {
  useEffect(() => {
    const original = window.fetch as PatchedFetch;
    if (original.__hlSortPatched) return; // StrictMode / remount guard

    const patched = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await original(input, init);
      const sortby = sortOf(input);
      if (!sortby || !res.ok) return res;
      try {
        const data = await res.clone().json();
        if (!data || !Array.isArray(data.products)) return res;
        data.products = sortProducts(data.products, sortby);
        // The body is re-encoded, so the old length/encoding no longer describe it.
        const headers = new Headers(res.headers);
        headers.delete("content-length");
        headers.delete("content-encoding");
        headers.set("content-type", "application/json; charset=utf-8");
        return new Response(JSON.stringify(data), {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      } catch {
        return res; // never let the fix be why the menu fails to load
      }
    }) as PatchedFetch;

    patched.__hlSortPatched = true;
    window.fetch = patched;

    return () => {
      // Only hand back if nobody wrapped fetch after us.
      if (window.fetch === patched) window.fetch = original;
    };
  }, []);

  return null;
}
