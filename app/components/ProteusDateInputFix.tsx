"use client";

import { useEffect } from "react";

/**
 * Lets people TYPE their birthdate on the quick sign-in instead of wheeling a
 * calendar back thirty years.
 *
 * JSCart's quick checkout (phone + birthdate) renders the field as
 * <input type="date">, so every shopper gets the browser's date picker. On a
 * phone that's a spinner you have to drag year by year; on the in-store tablets
 * it's worse, because quick checkout IS the kiosk sign-in and there's a queue
 * behind you.
 *
 * Their own registration form already does this properly — a plain text field
 * that inserts the slashes as you type (formatBirthdateInput in the widget). So
 * this makes the sign-in field behave the same way: same formatting, same
 * placeholder, numeric keypad on phones.
 *
 * ── WHY THIS IS SAFE TO SEND ─────────────────────────────────────────────────
 * The widget posts the field's raw value to api_auth.cfm?action=quickCheckout.
 * A type="date" input always yields YYYY-MM-DD, so that's what their server has
 * been receiving. Typed, it becomes MM/DD/YYYY — a different string, and sign-in
 * is not something to break on an assumption. So it was checked against the live
 * endpoint with a fake number:
 *
 *   1990-05-14   -> "No account was found matching that phone and birthdate"
 *   05/14/1990   -> "No account was found matching that phone and birthdate"
 *   not-a-date   -> "Please enter a valid phone number and birthdate"
 *
 * Both dates parse; only rubbish is refused. Their endpoint takes either form,
 * so nothing has to be converted before submitting.
 *
 * ⚠️ If Proteus ever tightens that endpoint to ISO only, this breaks sign-in.
 * The fix then is to convert MM/DD/YYYY back to YYYY-MM-DD on the way out, in a
 * capture-phase listener on the Continue button (its handler is an inline
 * onclick, so a capture listener still runs first).
 *
 * The modal is built and thrown away each time it opens, so this watches for the
 * field rather than patching once.
 */

const FIELD_ID = "proteus-quick-birthdate";
const DONE = "data-hl-typed-date";

/** Mirrors the widget's own formatBirthdateInput: digits in, MM/DD/YYYY out. */
function autoSlash(el: HTMLInputElement) {
  const digits = el.value.replace(/\D/g, "").slice(0, 8);
  if (digits.length >= 4) {
    el.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  } else if (digits.length >= 2) {
    el.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else {
    el.value = digits;
  }
}

export default function ProteusDateInputFix() {
  useEffect(() => {
    const onInput = (e: Event) => autoSlash(e.target as HTMLInputElement);

    const convert = () => {
      const el = document.getElementById(FIELD_ID) as HTMLInputElement | null;
      if (!el || el.hasAttribute(DONE)) return;
      el.setAttribute(DONE, "");
      el.type = "text";
      el.inputMode = "numeric";
      el.placeholder = "MM/DD/YYYY";
      el.maxLength = 10;
      // setAttribute, not the property: TS types `autocomplete` as a narrow
      // union that doesn't admit the bare "bday" token the spec allows.
      el.setAttribute("autocomplete", "bday");
      // A value already in the box is ISO, from before this ran — show it the
      // way it now reads.
      const iso = el.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) el.value = `${iso[2]}/${iso[3]}/${iso[1]}`;
      el.addEventListener("input", onInput);
    };

    convert();
    // The sign-in modal is appended to <body> and rebuilt on every open, so the
    // field has to be caught each time rather than patched once.
    const observer = new MutationObserver(convert);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      const el = document.getElementById(FIELD_ID);
      el?.removeEventListener("input", onInput);
    };
  }, []);

  return null;
}
