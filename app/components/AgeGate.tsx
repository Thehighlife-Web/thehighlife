"use client";

import { useEffect, useState } from "react";
import { store } from "@/data/site";

const KEY = "hl_age_verified";

/**
 * NY requires digital cannabis advertising to keep under-21 visitors out.
 *
 * ── ONE TAB, ONE ANSWER ──────────────────────────────────────────────────────
 * Confirming 21+ is remembered in sessionStorage, which browsers scope to a
 * single tab. So every new tab asks again, which is what the shop wants. It used
 * to be a 1-year cookie plus localStorage plus a server-rendered flag, and the
 * effect was that a desktop visitor was asked once and never again for a year —
 * the gate looked like it had stopped working.
 *
 * ⚠️ Deliberately NOT a cookie. A cookie is shared by every tab and window, so
 * any cookie here defeats the whole point. Don't add one back.
 *
 * ── WHY THE ANSWER IS HELD IN TWO PLACES ─────────────────────────────────────
 * The boot script in layout.tsx sets data-age="ok" before first paint, so moving
 * between pages in the same tab never flashes the gate. But on iOS Safari React
 * drops DOM attributes it doesn't own when it hydrates, and the gate used to
 * come back on every page load there. So this component ALSO reads
 * sessionStorage into React state and re-asserts the attribute: React owns the
 * decision, and no re-render can drop it.
 *
 * Re-asserting matters for more than the gate — PromoPopup and OrderTypeGate
 * both wait on data-age before they show anything.
 *
 * Fails CLOSED: if the script and storage both fail, nothing sets the attribute,
 * and globals.css keeps the gate up with the page behind it locked.
 */
export default function AgeGate() {
  const [denied, setDenied] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Already said yes in THIS tab: put the attribute back, in case hydration
  // dropped the one the boot script set. CSS does the hiding from there
  // (html[data-age="ok"] .agegate), which is why this sets no state — an effect
  // is for syncing an external system, and the <html> attribute is exactly
  // that. Setting state here is also what react-hooks/set-state-in-effect
  // rightly objects to.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") {
        document.documentElement.setAttribute("data-age", "ok");
      }
    } catch {
      /* storage blocked: stay closed and let them answer again */
    }
  }, []);

  function accept() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* blocked: it holds for this page via React state below, and the next
         page asks again — which is the safe way round for an age gate */
    }
    document.documentElement.setAttribute("data-age", "ok");
    setAccepted(true);
  }

  if (accepted) return null;

  return (
    <div className="agegate" role="dialog" aria-modal="true" aria-labelledby="gateQ">
      <div className="gate-box">
        {denied ? (
          <>
            <h2 className="gate-q" id="gateQ">
              Come Back
              <br />
              <span className="g">At 21</span>
            </h2>
            <p className="gate-sub">
              You must be 21 or older to enter this site. Thanks for stopping by — see you when
              you&rsquo;re of age.
            </p>
            <p className="gate-legal">
              Concerned about cannabis use? Text HOPENY, call 1-877-8-HOPENY, or visit
              oasas.ny.gov/HOPELine
            </p>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="gate-logo" src="/images/logo.webp" alt={store.name} />
            <h2 className="gate-q" id="gateQ">
              Are You
              <br />
              <span className="g">21 Or Older?</span>
            </h2>
            <p className="gate-sub">
              You must be 21 years of age or older to enter this site and shop at {store.name}.
            </p>
            <div className="gate-btns">
              <button className="btn primary" type="button" onClick={accept}>
                Yes, I&rsquo;m 21+
              </button>
              <button className="btn ghost" type="button" onClick={() => setDenied(true)}>
                No, I&rsquo;m Under 21
              </button>
            </div>
            <p className="gate-legal">
              By entering, you confirm you are 21 or older and agree to consume responsibly.
              Licensed by the New York State Office of Cannabis Management. NYS OCM# {store.license}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
