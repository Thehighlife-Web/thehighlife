"use client";

import { useEffect, useState } from "react";

/**
 * TEMPORARY. Answers one question, then gets deleted.
 *
 * ── The question ─────────────────────────────────────────────────────────────
 * A customer signs in at the kiosk with phone + birthday, hits checkout, and
 * Proteus's checkout page asks them to sign in AGAIN with the same two things.
 *
 * The widget is supposed to carry the session across: checkout() posts a hidden
 * `authToken` field to checkout_init.cfm, and its own comment says the form POST
 * exists to "bypass CORS/session issues". So either
 *
 *   A. the token is fine and the receiving host won't accept it — checkout goes
 *      to cart.thehighlifeny.com while the token was issued by cart.proteus420.com
 *   B. there is no usable token, because api_auth.cfm?action=quickCheckout
 *      returns success without one (the website's email+password sign-in uses a
 *      different endpoint, action=login)
 *
 * They need opposite fixes — A is one line in ProteusShop, B is Proteus's to fix —
 * so guessing on a checkout taking ~$1,000 a day is the expensive option.
 *
 * ── Why an on-screen badge ───────────────────────────────────────────────────
 * The kiosk is a locked tablet with no developer tools and no address bar, and
 * the same reading is needed from a phone on /menu. A badge is the only way to
 * see it where it actually happens.
 *
 * ── Safety ───────────────────────────────────────────────────────────────────
 * Only renders with ?diag=1 in the URL, so a customer never sees it. It reports
 * the LENGTH of the token, never the value — a token is a live credential and
 * this thing is designed to be photographed and sent to me.
 *
 * Runs on both /kiosk and /menu deliberately: which surface fails is the reading
 * that decides the fix.
 */

type Snapshot = {
  storageKey: string;
  hasEntry: boolean;
  hasToken: boolean;
  tokenLen: number;
  expiresAt: string;
  expired: boolean | null;
  customer: string;
  /** token length at the instant the checkout form was submitted */
  atCheckout: number | null;
  checkoutHost: string;
};

const KEY = "proteus_auth_highlife";

export default function AuthDiag() {
  const [on, setOn] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(location.search);
    } catch {
      return;
    }
    if (params.get("diag") !== "1") return;
    setOn(true);

    let atCheckout: number | null = null;
    let checkoutHost = "";

    const read = (): Snapshot => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(KEY);
      } catch {
        /* private mode */
      }
      let parsed: { token?: string; customer?: { firstName?: string }; expiresAt?: string } = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        /* leave empty */
      }
      const token = typeof parsed.token === "string" ? parsed.token : "";
      const exp = parsed.expiresAt ?? "";
      return {
        storageKey: KEY,
        hasEntry: !!raw,
        hasToken: token.length > 0,
        tokenLen: token.length,
        expiresAt: exp,
        expired: exp ? new Date(exp) <= new Date() : null,
        customer: parsed.customer?.firstName ?? "",
        atCheckout,
        checkoutHost,
      };
    };

    setSnap(read());
    const poll = setInterval(() => setSnap(read()), 1000);

    // Catch the value at the moment it matters. The widget builds a <form>, appends
    // it to the body and submits it — so intercept submit rather than trying to
    // guess when checkout() runs. Same interception approach as ProteusStockLimit.
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;
      if (!/checkout_init\.cfm/i.test(form.action || "")) return;
      const field = form.querySelector<HTMLInputElement>('input[name="authToken"]');
      // "null"/"undefined" get stringified into the field by the widget when the
      // token is missing — that is the failure we are looking for, so count it as 0.
      const v = field?.value ?? "";
      atCheckout = v === "null" || v === "undefined" ? 0 : v.length;
      try {
        checkoutHost = new URL(form.action).host;
      } catch {
        checkoutHost = form.action || "";
      }
      setSnap(read());
      // Let the submit proceed untouched.
    };
    document.addEventListener("submit", onSubmit, true);

    return () => {
      clearInterval(poll);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  if (!on || !snap) return null;

  const row = (label: string, value: string, bad?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <b style={{ color: bad ? "#ff8a8a" : "#7bffb0" }}>{value}</b>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 2147483600,
        background: "rgba(6,10,8,.94)",
        color: "#eafff2",
        border: "1px solid #2f4a3a",
        borderRadius: 10,
        padding: "10px 12px",
        font: "12px/1.55 ui-monospace, Consolas, monospace",
        minWidth: 250,
        maxWidth: "min(94vw, 340px)",
        pointerEvents: "none",
        boxShadow: "0 8px 28px rgba(0,0,0,.5)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, letterSpacing: ".06em" }}>AUTH DIAGNOSTIC</div>
      {row("page", location.pathname)}
      {row("session stored", snap.hasEntry ? "yes" : "NO", !snap.hasEntry)}
      {row("token present", snap.hasToken ? "yes" : "NO", !snap.hasToken)}
      {row("token length", String(snap.tokenLen), snap.tokenLen === 0)}
      {snap.customer ? row("signed in as", snap.customer) : null}
      {snap.expiresAt
        ? row("expired", snap.expired ? "YES" : "no", !!snap.expired)
        : row("expires", "not set")}
      <div style={{ borderTop: "1px solid #2f4a3a", margin: "7px 0", paddingTop: 6 }}>
        {snap.atCheckout === null
          ? row("at checkout", "press checkout")
          : row("token sent", snap.atCheckout > 0 ? `${snap.atCheckout} chars` : "EMPTY", snap.atCheckout === 0)}
        {snap.checkoutHost ? row("posted to", snap.checkoutHost) : null}
      </div>
      <div style={{ opacity: 0.55, fontSize: 10.5, marginTop: 4 }}>
        temporary · ?diag=1 only · no token values shown
      </div>
    </div>
  );
}
