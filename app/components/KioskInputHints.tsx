"use client";

import { useEffect } from "react";

/**
 * Makes JSCart's quick/guest checkout fields workable on an in-store tablet.
 *
 * Two jobs, both about the on-screen keyboard:
 *
 * 1. Keypads, not QWERTY — set inputMode on the phone fields.
 *
 * 2. Typed birthdate, with an MM/DD/YYYY mask and a numeric keypad, so nobody
 *    has to wheel a calendar back 30+ years with a queue behind them.
 *
 *    ⚠️ HAND THE WIDGET MM/DD/YYYY — NEVER ISO. This used to rewrite the value
 *    to YYYY-MM-DD just before Continue, because the widget then rendered a
 *    type="date" input and posted the field raw. Proteus has since changed
 *    submitQuickCheckout(): it now requires the field to match
 *    /^(\d{2})\/(\d{2})\/(\d{4})$/ and converts to ISO itself. Our ISO rewrite
 *    failed that check, so EVERY kiosk sign-in was refused with "Please enter
 *    your birthdate as MM/DD/YYYY." while the box plainly showed 05/14/1990
 *    (reported Nov 2026). MM/DD/YYYY is also what their server accepts directly
 *    (see ProteusDateInputFix), so it's the right string for the old widget too.
 *
 *    A capture-phase listener still runs before the widget's inline onclick, but
 *    only to tidy the value into exact MM/DD/YYYY and to refuse a date that
 *    can't be real with a clearer message than theirs.
 *
 * The widget builds and destroys this modal itself, so everything re-applies on a
 * light interval and is guarded against double-binding (same approach as
 * MenuDealsMore). Kiosk-only — rendered from /kiosk.
 */
const BD_ID = "proteus-quick-birthdate";
const MARK = "data-hl-typed";

const PHONE_HINTS: [string, "tel" | "numeric"][] = [
  ["proteus-quick-phone", "tel"],
  ["proteus-guest-phone", "tel"],
];

/** "12/25/1990" (or "12251990") -> "12/25/1990". null when it isn't a real date. */
function toUS(typed: string): string | null {
  const d = typed.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const mm = d.slice(0, 2);
  const dd = d.slice(2, 4);
  const yyyy = d.slice(4, 8);
  const m = Number(mm);
  const day = Number(dd);
  const y = Number(yyyy);
  if (m < 1 || m > 12 || day < 1 || day > 31) return null;
  if (y < 1900 || y > new Date().getFullYear()) return null;
  // Reject the likes of 02/31 — the Date would roll into March.
  const probe = new Date(y, m - 1, day);
  if (probe.getMonth() !== m - 1 || probe.getDate() !== day) return null;
  return `${mm}/${dd}/${yyyy}`;
}

/** Digits in, slashes added as you go. */
function mask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export default function KioskInputHints() {
  useEffect(() => {
    const onType = (e: Event) => {
      const el = e.target as HTMLInputElement;
      const masked = mask(el.value);
      if (el.value !== masked) el.value = masked;
    };

    const apply = () => {
      for (const [id, mode] of PHONE_HINTS) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el && el.inputMode !== mode) el.inputMode = mode;
      }

      const bd = document.getElementById(BD_ID) as HTMLInputElement | null;
      if (bd && !bd.hasAttribute(MARK)) {
        bd.setAttribute(MARK, "1");
        bd.type = "text"; // drops the OS calendar picker
        bd.inputMode = "numeric";
        bd.placeholder = "MM/DD/YYYY";
        bd.maxLength = 10;
        bd.setAttribute("autocomplete", "bday");
        bd.value = "";
        bd.addEventListener("input", onType);
      }
    };

    // Runs before the submit button's inline onclick (capture phase), so the
    // widget reads exact MM/DD/YYYY — the only form its own check accepts.
    // Blocks submission on a date that can't be real and speaks through the
    // widget's own error element.
    const normalizeBeforeSubmit = (e: Event) => {
      const bd = document.getElementById(BD_ID) as HTMLInputElement | null;
      if (!bd || !bd.hasAttribute(MARK) || !bd.value.trim()) return;

      const us = toUS(bd.value);
      if (us) {
        if (bd.value !== us) bd.value = us;
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      const err = document.getElementById("proteus-quick-error");
      if (err) {
        // Not "enter it as MM/DD/YYYY" — the person usually already did, and
        // being told to do what you just did is what got this reported.
        err.textContent = "Please check your birthdate — that date doesn't look right (example: 05/14/1990).";
        (err as HTMLElement).style.display = "block";
      }
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("#proteus-quick-submit")) normalizeBeforeSubmit(e);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("#proteus-quick-panel")) normalizeBeforeSubmit(e);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    apply();
    const t = setInterval(apply, 1000);
    return () => {
      clearInterval(t);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
