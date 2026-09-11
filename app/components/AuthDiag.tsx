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

/** What we keep after the page has gone to Proteus. Deliberately no customer
 *  name and no token value — see WRITTEN RECORD below. */
type LastRun = { at: number; page: string; sent: number; host: string; hadSession: boolean };

const KEY = "proteus_auth_highlife";

/**
 * ── WRITTEN RECORD ───────────────────────────────────────────────────────────
 * Pressing checkout navigates the tablet away to Proteus, taking the live badge
 * with it. Nobody can photograph a number in the half second before that, least
 * of all with a real customer waiting — and the whole point is to catch a FIRST
 * TIME customer, who turns up when they turn up.
 *
 * So the reading is written to storage as it happens and shown again on the next
 * load. Leave the tablet on ?diag=1, let a new customer use it, and read the
 * answer afterwards at your leisure.
 *
 * Survives what the kiosk does between customers: kioskFullReset() deletes only
 * the orderComplete/invoice/kiosk/view params and reloads, so ?diag=1 stays in
 * the address bar, and it clears the cart and auth but not this key.
 *
 * Records no customer name and no token value — this sits on a shared tablet in
 * a shop. Lengths and a timestamp are enough to tell the two causes apart.
 */
const LAST = "hl_authdiag_last";

/**
 * ── WHY THE FLAG IS STICKY ───────────────────────────────────────────────────
 * ?diag=1 cannot survive in the address bar. The widget rewrites the URL from its
 * own view state on every navigation — pushState() calls buildUrl(), which
 * reconstructs the query string and keeps only params it owns. Ours is dropped
 * within a second of load, so it is gone by the next reload — and the kiosk
 * reloads after every order and every idle timeout.
 *
 * That kills the whole point: waiting for a first-time customer means leaving the
 * tablet in this mode for hours. So ?diag=1 arms it in storage instead, and it
 * stays armed across reloads until it expires or is switched off with ?diag=0.
 *
 * EXPIRES ON ITS OWN after 24 hours. A debug badge left on a shop-floor tablet
 * is exactly the sort of thing that gets forgotten, and a customer should never
 * meet it. The badge shows the time remaining so it is never a surprise.
 */
const ARMED = "hl_authdiag_until";
const WINDOW_MS = 24 * 60 * 60 * 1000;

export default function AuthDiag() {
  const [on, setOn] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);

  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(location.search);
    } catch {
      return;
    }
    const flag = params.get("diag");

    if (flag === "0") {
      try {
        localStorage.removeItem(ARMED);
        localStorage.removeItem(LAST);
      } catch {
        /* ignore */
      }
      return; // switched off, and the recorded reading cleared with it
    }

    let until = 0;
    try {
      until = Number(localStorage.getItem(ARMED)) || 0;
    } catch {
      /* ignore */
    }

    if (flag === "1") {
      until = Date.now() + WINDOW_MS;
      try {
        localStorage.setItem(ARMED, String(until));
      } catch {
        /* private mode: this load only */
      }
    } else if (until <= Date.now()) {
      if (until) {
        try {
          localStorage.removeItem(ARMED);
        } catch {
          /* ignore */
        }
      }
      return; // never armed, or the 24 hours ran out
    }

    setExpiresIn(until);
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

    // Catch the value at the moment it matters: when the checkout form leaves.
    //
    // ⚠️ A `submit` EVENT LISTENER ALONE NEVER FIRES HERE. checkout() ends with
    //     document.body.appendChild(form);
    //     form.submit();
    // and HTMLFormElement.submit() deliberately skips the submit event — it is the
    // programmatic path, with no event and no validation. The first version of
    // this component listened for the event, passed every test (the tests fired
    // the event by hand), and would have recorded nothing on a real checkout.
    //
    // So wrap the method itself, the same way ProteusStockLimit wraps
    // _cardIncrementQty. The listener stays too, for a checkout that ever submits
    // through a real button.
    const record = (form: HTMLFormElement) => {
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
      // Write it down before the page leaves. Synchronous, so it lands.
      try {
        const rec: LastRun = {
          at: Date.now(),
          page: location.pathname,
          sent: atCheckout,
          host: checkoutHost,
          hadSession: read().hasToken,
        };
        localStorage.setItem(LAST, JSON.stringify(rec));
      } catch {
        /* private mode — the live badge still shows it */
      }
      setSnap(read());
    };

    // The path checkout() actually takes. Record, then hand straight back to the
    // real submit — never block it, never touch the form.
    const nativeSubmit = HTMLFormElement.prototype.submit;
    const wrapped = function (this: HTMLFormElement) {
      try {
        record(this);
      } catch {
        /* a diagnostic must never be the reason a checkout fails */
      }
      return nativeSubmit.call(this);
    };
    HTMLFormElement.prototype.submit = wrapped;

    const onSubmit = (e: Event) => record(e.target as HTMLFormElement);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      clearInterval(poll);
      document.removeEventListener("submit", onSubmit, true);
      if (HTMLFormElement.prototype.submit === wrapped) {
        HTMLFormElement.prototype.submit = nativeSubmit;
      }
    };
  }, []);

  if (!on || !snap) return null;

  // The reading from the last time anyone pressed checkout on this tablet.
  let last: LastRun | null = null;
  try {
    const raw = localStorage.getItem(LAST);
    last = raw ? (JSON.parse(raw) as LastRun) : null;
  } catch {
    /* ignore */
  }
  const ago = (t: number) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };

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
      {/* Survives the navigation to Proteus, so the answer can be read later. */}
      <div
        style={{
          borderTop: "1px solid #2f4a3a",
          marginTop: 7,
          paddingTop: 6,
          background: last ? "rgba(123,255,176,.06)" : undefined,
          borderRadius: 6,
          padding: last ? "6px 7px" : undefined,
        }}
      >
        <div style={{ opacity: 0.7, marginBottom: 3, letterSpacing: ".05em" }}>
          LAST CHECKOUT ON THIS TABLET
        </div>
        {last ? (
          <>
            {row("when", ago(last.at))}
            {row("from", last.page)}
            {row("token sent", last.sent > 0 ? `${last.sent} chars` : "EMPTY", last.sent === 0)}
            {row("posted to", last.host)}
          </>
        ) : (
          <div style={{ opacity: 0.6 }}>nothing recorded yet</div>
        )}
      </div>
      <div style={{ opacity: 0.55, fontSize: 10.5, marginTop: 5, lineHeight: 1.5 }}>
        {expiresIn
          ? `stays on ${Math.max(1, Math.round((expiresIn - Date.now()) / 3600000))}h more · turn off with ?diag=0`
          : "turn off with ?diag=0"}
        <br />
        no names or token values kept
      </div>
    </div>
  );
}
