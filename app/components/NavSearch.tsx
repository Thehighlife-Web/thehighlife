"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Search the shop from the top of any page.
 *
 * The products live in Proteus's JSCart widget, which has its own search — but
 * only once you're on /menu and only inside the shop panel. This puts the box
 * where people look for it, and hands the term to the widget two different ways
 * depending on where they are:
 *
 *  • ALREADY ON THE SHOP (/menu, /deals): fill JSCart's own input and call
 *    _submitSearch(). It re-renders in place and pushes its own history entry,
 *    so no reload and the Back button still behaves.
 *  • ANYWHERE ELSE: go to /menu#view=products&search=TERM. The widget reads
 *    `search` straight out of the URL when it starts (restoreFromUrl), which is
 *    also what makes a searched page shareable.
 *
 * ⚠️ The in-place path depends on JSCart internals — the element id
 * "proteus-search" and the method _submitSearch. Both are checked before use
 * and it falls back to the URL, which is their documented behaviour and far
 * less likely to move. If search ever stops working in place but still works
 * after a reload, that's what changed.
 *
 * An empty box does nothing rather than loading every product.
 */
export default function NavSearch({ variant }: { variant: "bar" | "drawer" }) {
  const path = usePathname() ?? "";
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Where JSCart is mounted and can be searched without leaving the page.
  const onShop = path.startsWith("/menu") || path.startsWith("/deals");

  type WidgetWindow = Window & {
    ProteusWidget?: { _submitSearch?: () => void };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) {
      inputRef.current?.focus();
      return;
    }

    if (onShop) {
      const field = document.getElementById("proteus-search") as HTMLInputElement | null;
      const widget = (window as WidgetWindow).ProteusWidget;
      if (field && typeof widget?._submitSearch === "function") {
        field.value = term;
        widget._submitSearch();
        inputRef.current?.blur();
        return;
      }
    }
    window.location.href = `/menu#view=products&search=${encodeURIComponent(term)}`;
  };

  return (
    <form
      className={variant === "drawer" ? "navsearch navsearch-drawer" : "navsearch"}
      role="search"
      onSubmit={submit}
    >
      <label className="sr-only" htmlFor={`navsearch-${variant}`}>
        Search products
      </label>
      <input
        ref={inputRef}
        id={`navsearch-${variant}`}
        type="search"
        className="navsearch-input"
        placeholder="Search products"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      <button className="navsearch-go" type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
