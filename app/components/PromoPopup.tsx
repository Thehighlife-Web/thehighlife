"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { promoPopup } from "@/data/site";

/**
 * The promo pop-up — right now, the Grand Opening (see promoPopup in data/site.ts).
 *
 * ── WHEN IT SHOWS ────────────────────────────────────────────────────────────
 * After the 21+ gate, never over it: the gate is the legal control and must be
 * answered first. The gate sets data-age="ok" on <html>, so that's the cue. On a
 * first visit accepting the gate reloads the page (see AgeGate), so this simply
 * finds the attribute already set; when cookies are blocked there's no reload, so
 * the attribute is watched as well.
 *
 * Once per device per day, keyed on the Eastern date — a two-day event should
 * reach someone on both days, but not on every page they open.
 *
 * ⚠️ IT TAKES ITSELF DOWN at promoPopup.endsAt. Pages render per request (the
 * layout reads the age-gate cookie), so the date is checked on every visit rather
 * than baked in at build time.
 *
 * Not on /kiosk or /signage: those are in-store screens that skip the gate, and a
 * pop-up on a shop tablet is in the way of a customer with nobody to close it.
 *
 * ── WORDS, NOT A PICTURE ─────────────────────────────────────────────────────
 * This used to be the Grand Opening flyer as an image. It's typeset from
 * promoPopup (data/site.ts) now, which costs nothing to download, stays sharp at
 * any size, reflows on a narrow phone instead of shrinking the small print to
 * nothing, and can actually be read aloud. The flyer is still in the repo at
 * public/images/grand-opening.webp if it's ever wanted back.
 *
 * Reuses the product modal's backdrop, close button and scroll lock
 * (.modal-back / .modal-x / html.modal-open in globals.css).
 */

const END = promoPopup ? new Date(promoPopup.endsAt).getTime() : 0;

/** Remembers the Eastern date it was last shown on this device. */
const SEEN_KEY = "hl_promo_seen";

const easternDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

export default function PromoPopup() {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!promoPopup || Date.now() >= END) return;
    if (path.startsWith("/kiosk") || path.startsWith("/signage")) return;

    try {
      if (localStorage.getItem(SEEN_KEY) === easternDate()) return;
    } catch {
      /* private mode: it shows this visit, which is the safe way round */
    }

    const html = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // A beat after the page settles, so it doesn't slam up mid-paint.
    //
    // ⚠️ "Seen today" is written when it OPENS, never before. Accepting the gate
    // RELOADS the page (AgeGate writes the cookie, then reloads so the gate can't
    // come back on iOS). Marking it seen at decision time meant the reload threw
    // away the pending pop-up and the fresh page then skipped it as already seen —
    // so it never appeared on the visit it was meant for.
    const show = () => {
      timer = setTimeout(() => {
        try {
          localStorage.setItem(SEEN_KEY, easternDate());
        } catch {
          /* ignore */
        }
        setOpen(true);
      }, 700);
    };

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
  }, [path]);

  // Escape to close, the page behind held still, and focus moved to the close
  // button so a keyboard isn't left behind the pop-up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("modal-open");
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("modal-open");
      previous?.focus?.();
    };
  }, [open, close]);

  if (!open || !promoPopup) return null;

  return (
    <div className="modal-back" role="presentation" onClick={close}>
      <div
        className="promo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} className="modal-x" type="button" onClick={close} aria-label="Close">
          ✕
        </button>

        <div className="promo-msg">
          <h2 className="promo-title" id="promo-title">
            {promoPopup.title}
          </h2>
          <p className="promo-body">{promoPopup.body}</p>
          <p className="promo-tagline">{promoPopup.tagline}</p>
          <p className="promo-where">
            <span className="promo-dates">{promoPopup.dates}</span>
            <span className="promo-address">{promoPopup.address}</span>
          </p>
        </div>

        <div className="promo-actions">
          <a className="btn primary" href={promoPopup.href} onClick={close}>
            {promoPopup.cta} →
          </a>
          <button className="btn ghost" type="button" onClick={close}>
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
