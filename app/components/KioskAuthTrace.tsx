"use client";

import { useEffect, useState } from "react";

/**
 * TEMPORARY. Answers one question, then gets deleted.
 *
 * ── THE QUESTION ─────────────────────────────────────────────────────────────
 * A FIRST TIME customer signs in at the kiosk with phone + birthday, presses
 * checkout, and Proteus's checkout page shows its own login list — all the
 * options, their styling. They sign in again, and every order after that works.
 *
 * The widget is supposed to carry the sign-in across: checkout() posts a hidden
 * `authToken` field to checkout_init.cfm. Two things could break that, and they
 * need opposite fixes:
 *
 *   A. api_auth.cfm?action=quickCheckout hands back a token the rest of Proteus
 *      won't validate. Their own source admits this happens elsewhere — the
 *      registration webservice "issues its own token type that api_account /
 *      api_cart can't validate", and the widget works around it by doing a
 *      second, normal login. A first-time kiosk customer is the same shape: a
 *      POS-only record with no web account yet.
 *   B. The token is genuinely fine and checkout_init.cfm refuses it anyway.
 *
 * A may be workable from here. B is Proteus's alone. Two guesses have already
 * been shipped and neither fixed it, so this measures instead.
 *
 * ── WHY IT RECORDS UNCONDITIONALLY ───────────────────────────────────────────
 * The version of this that shipped before only recorded while ARMED with
 * ?diag=1, and the arming expired after 24 hours. Every capturing line sat below
 * an early `return`. A first-time customer turns up when they turn up — so they
 * walked through while it was unarmed and nothing was written down. That is the
 * flaw, not the idea.
 *
 * So: recording is always on, and ?diag=1 now controls the DISPLAY only. There
 * is nothing to arm and nothing to remember. A customer never sees anything.
 *
 * Mounted on /kiosk only. The website checks out correctly and must not be
 * touched by a diagnostic.
 *
 * ── WHAT IT KEEPS ────────────────────────────────────────────────────────────
 * Lengths, booleans, response key NAMES, a hostname and a timestamp. Never the
 * phone number, the birthday, the name, the email, or the token value. This sits
 * on a shared tablet in a shop and is meant to be photographed and sent to me.
 */

/** Where the reading lives. Survives the navigation to Proteus and the kiosk's
 *  own between-customer reset (kioskFullReset clears the cart and auth, and only
 *  its own URL params — not this key). */
const TRACE = "hl_kiosktrace";

/** The two inert keys the previous diagnostic left on any tablet that was armed.
 *  Nothing reads them; clear them on sight so the tablet isn't carrying litter. */
const DEAD = ["hl_authdiag_until", "hl_authdiag_last"];

type Verify = "pass" | "fail" | "expired" | "error" | "pending";

/** ProteusSearchFix also wraps fetch, and marks its wrapper so a remount can't
 *  double-patch. Same idea here: without it, StrictMode's mount → cleanup →
 *  mount would be fine, but any path that skips the cleanup would leave two
 *  wrappers recording the same sign-in twice. */
type TracedFetch = typeof fetch & { __hlTracePatched?: true };

type Trace = {
  /** when the quick login came back */
  at: number;
  /** which top-level keys Proteus's response carried — names only */
  keys: string;
  /** response.success */
  ok: boolean | null;
  tokenLen: number;
  /** did expiresAt parse to a date in the future */
  expFuture: boolean | null;
  /** was there a customer id on the response */
  custId: boolean;
  /** what Proteus's OWN token check said about the token it had just minted */
  verify: Verify | null;
  verifyCust: boolean | null;
  /** the checkout leg, filled in when the form leaves */
  coAt: number | null;
  coSent: number | null;
  coHost: string;
};

const BLANK: Trace = {
  at: 0,
  keys: "",
  ok: null,
  tokenLen: 0,
  expFuture: null,
  custId: false,
  verify: null,
  verifyCust: null,
  coAt: null,
  coSent: null,
  coHost: "",
};

function readTrace(): Trace | null {
  try {
    const raw = localStorage.getItem(TRACE);
    return raw ? (JSON.parse(raw) as Trace) : null;
  } catch {
    return null;
  }
}

/** `fresh` starts a new reading — a new sign-in shouldn't inherit the last
 *  customer's checkout leg. Otherwise the patch merges into what's there. */
function writeTrace(patch: Partial<Trace>, fresh = false) {
  try {
    const base = fresh ? BLANK : readTrace() ?? BLANK;
    localStorage.setItem(TRACE, JSON.stringify({ ...base, ...patch }));
  } catch {
    /* private mode — the badge still shows this session */
  }
}

/**
 * The answer in one line, so nobody has to interpret the numbers — including me,
 * reading it back off a photograph.
 */
function verdict(t: Trace | null): { text: string; bad: boolean } {
  if (!t) return { text: "nothing recorded yet", bad: false };
  if (t.ok === false) return { text: "quick login was REJECTED by Proteus", bad: true };
  if (t.tokenLen === 0) return { text: "Proteus returned NO TOKEN — their fix", bad: true };
  if (t.verify === "fail" || t.verify === "expired")
    return { text: "Proteus won't validate its OWN token — try a 2nd login", bad: true };
  if (t.verify === "pending") return { text: "token check didn't finish", bad: true };
  if (t.verify === "error") return { text: "token check couldn't reach Proteus", bad: true };
  if (t.coSent === 0) return { text: "good token, checkout sent NONE — our bug", bad: true };
  if (t.verify === "pass" && (t.coSent ?? 0) > 0)
    return { text: "good token, checkout refused it — their fix", bad: true };
  return { text: "token good — press checkout to finish the reading", bad: false };
}

export default function KioskAuthTrace() {
  const [on, setOn] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    // ?diag=1 shows the badge, ?diag=0 clears the reading. Neither affects
    // recording, which is always on. Read once: the widget rewrites the address
    // bar from its own view state within a second of load (pushState calls
    // buildUrl, which keeps only params it owns), so the flag leaves the URL
    // shortly after — but it stays in this component's state for the life of the
    // page, and the next reload correctly shows nothing.
    try {
      const flag = new URLSearchParams(location.search).get("diag");
      if (flag === "0") {
        localStorage.removeItem(TRACE);
      } else if (flag === "1") {
        setOn(true);
      }
    } catch {
      /* no URL access: stay hidden, keep recording */
    }

    try {
      DEAD.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }

    const redraw = () => bump((n) => n + 1);

    // ── 2. Ask Proteus whether the token it just minted is valid ─────────────
    //
    // This is the decisive reading, and it is Proteus's own check — the widget
    // makes exactly this call against a stored token at startup. Running it on a
    // FRESH token separates "the token was never any good" from "the token was
    // fine and checkout refused it", before checkout is even pressed.
    //
    // The URL is derived from the request just watched rather than from config,
    // so it follows whichever host the widget is actually using.
    //
    // `nativeFetch` is whatever fetch was here when we mounted — which is
    // ProteusSearchFix's wrapper, not the browser's. That's correct: we chain
    // onto it rather than replace it, so its URL correction still happens.
    const priorFetch = window.fetch as TracedFetch;
    const nativeFetch = priorFetch.bind(window);

    const checkToken = (quickUrl: string, token: string) => {
      let verifyUrl: string;
      try {
        const u = new URL(quickUrl);
        u.search = "?action=verify";
        verifyUrl = u.toString();
      } catch {
        return;
      }
      nativeFetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
      })
        .then((r) => r.json())
        .then((d) => {
          writeTrace({
            verify: d?.expired ? "expired" : d?.success ? "pass" : "fail",
            verifyCust: !!d?.customer,
          });
          redraw();
        })
        .catch(() => {
          writeTrace({ verify: "error" });
          redraw();
        });
    };

    // ── 1. What Proteus's quick login actually returns ───────────────────────
    //
    // Wrapping fetch is the only way to see it: the response is consumed inside
    // the widget's own submitQuickCheckout() and never exposed. The clone is
    // essential — reading the original body would leave the widget with a used
    // stream and break sign-in outright.
    const wrappedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const resp = nativeFetch(input, init);
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : String(input);
        // Match only quickCheckout, so the verify call above can't recurse.
        if (/api_auth\.cfm/i.test(url) && /action=quickCheckout/i.test(url)) {
          resp
            .then((r) => r.clone().json())
            .then((data) => {
              const token = typeof data?.token === "string" ? data.token : "";
              writeTrace(
                {
                  at: Date.now(),
                  keys: Object.keys(data ?? {}).join(","),
                  ok: typeof data?.success === "boolean" ? data.success : null,
                  tokenLen: token.length,
                  expFuture: data?.expiresAt
                    ? new Date(data.expiresAt).getTime() > Date.now()
                    : null,
                  custId: !!data?.customer?.id,
                  verify: token ? "pending" : null,
                },
                true,
              );
              redraw();
              if (token) checkToken(url, token);
            })
            .catch(() => {
              /* a diagnostic must never be why a sign-in fails */
            });
        }
      } catch {
        /* ditto */
      }
      return resp;
    }) as TracedFetch;

    if (!priorFetch.__hlTracePatched) {
      wrappedFetch.__hlTracePatched = true;
      window.fetch = wrappedFetch;
    }

    // ── 3. What actually leaves in the checkout POST ─────────────────────────
    //
    // ⚠️ A `submit` EVENT LISTENER ALONE NEVER FIRES HERE. checkout() ends with
    //     document.body.appendChild(form);
    //     form.submit();
    // and HTMLFormElement.submit() deliberately skips the submit event — it is
    // the programmatic path, with no event and no validation. The first version
    // of this listened for the event, passed every test (the tests fired the
    // event by hand), and would have recorded nothing on a real checkout.
    //
    // So wrap the method itself, the same way ProteusStockLimit wraps
    // _cardIncrementQty. The listener stays too, for a checkout that ever
    // submits through a real button.
    const record = (form: HTMLFormElement) => {
      if (!form || form.tagName !== "FORM") return;
      if (!/checkout_init\.cfm/i.test(form.action || "")) return;
      const field = form.querySelector<HTMLInputElement>('input[name="authToken"]');
      // The widget stringifies a missing token into the field as "null" /
      // "undefined" — that IS the failure being looked for, so count it as 0.
      const v = field?.value ?? "";
      const sent = v === "null" || v === "undefined" ? 0 : v.length;
      let host = "";
      try {
        host = new URL(form.action).host;
      } catch {
        host = form.action || "";
      }
      // Synchronous, so it lands before the page leaves for Proteus.
      writeTrace({ coAt: Date.now(), coSent: sent, coHost: host });
      redraw();
    };

    type TracedSubmit = typeof HTMLFormElement.prototype.submit & { __hlTracePatched?: true };
    const nativeSubmit = HTMLFormElement.prototype.submit as TracedSubmit;
    const wrappedSubmit = function (this: HTMLFormElement) {
      try {
        record(this);
      } catch {
        /* a diagnostic must never be the reason a checkout fails */
      }
      return nativeSubmit.call(this);
    } as TracedSubmit;
    if (!nativeSubmit.__hlTracePatched) {
      wrappedSubmit.__hlTracePatched = true;
      HTMLFormElement.prototype.submit = wrappedSubmit;
    }

    const onSubmit = (e: Event) => record(e.target as HTMLFormElement);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      document.removeEventListener("submit", onSubmit, true);
      if (HTMLFormElement.prototype.submit === wrappedSubmit) {
        HTMLFormElement.prototype.submit = nativeSubmit;
      }
      if (window.fetch === wrappedFetch) {
        window.fetch = nativeFetch;
      }
    };
  }, []);

  if (!on) return null;

  const t = readTrace();
  const v = verdict(t);
  const ago = (ms: number) => {
    const m = Math.round((Date.now() - ms) / 60000);
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
        minWidth: 260,
        maxWidth: "min(94vw, 360px)",
        pointerEvents: "none",
        boxShadow: "0 8px 28px rgba(0,0,0,.5)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, letterSpacing: ".06em" }}>
        KIOSK SIGN-IN TRACE
      </div>

      {t ? (
        <>
          <div style={{ opacity: 0.7, letterSpacing: ".05em", marginBottom: 3 }}>QUICK LOGIN</div>
          {row("when", ago(t.at))}
          {row("accepted", t.ok === null ? "—" : t.ok ? "yes" : "NO", t.ok === false)}
          {row("token length", String(t.tokenLen), t.tokenLen === 0)}
          {row(
            "expiry ahead",
            t.expFuture === null ? "not set" : t.expFuture ? "yes" : "NO",
            t.expFuture === false,
          )}
          {row("customer id", t.custId ? "yes" : "NO", !t.custId)}
          {t.keys ? row("fields back", t.keys) : null}

          <div style={{ borderTop: "1px solid #2f4a3a", margin: "7px 0", paddingTop: 6 }}>
            <div style={{ opacity: 0.7, letterSpacing: ".05em", marginBottom: 3 }}>
              PROTEUS&apos;S OWN TOKEN CHECK
            </div>
            {row("result", t.verify ?? "—", t.verify !== null && t.verify !== "pass")}
            {row(
              "customer back",
              t.verifyCust === null ? "—" : t.verifyCust ? "yes" : "NO",
              t.verifyCust === false,
            )}
          </div>

          <div style={{ borderTop: "1px solid #2f4a3a", margin: "7px 0", paddingTop: 6 }}>
            <div style={{ opacity: 0.7, letterSpacing: ".05em", marginBottom: 3 }}>CHECKOUT POST</div>
            {t.coAt === null ? (
              row("status", "press checkout")
            ) : (
              <>
                {row("when", ago(t.coAt))}
                {row(
                  "token sent",
                  (t.coSent ?? 0) > 0 ? `${t.coSent} chars` : "EMPTY",
                  t.coSent === 0,
                )}
                {row("posted to", t.coHost)}
              </>
            )}
          </div>
        </>
      ) : (
        <div style={{ opacity: 0.6 }}>nothing recorded yet — sign in with phone + birthday</div>
      )}

      <div
        style={{
          borderTop: "1px solid #2f4a3a",
          marginTop: 7,
          paddingTop: 6,
          color: v.bad ? "#ff8a8a" : "#7bffb0",
          fontWeight: 700,
        }}
      >
        {v.text}
      </div>
      <div style={{ opacity: 0.55, fontSize: 10.5, marginTop: 5, lineHeight: 1.5 }}>
        always recording · panel only shows with ?diag=1 · clear with ?diag=0
        <br />
        no names, numbers, birthdays or token values kept
      </div>
    </div>
  );
}
