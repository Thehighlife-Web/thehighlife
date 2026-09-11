"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dealOfTheDay } from "@/data/site";

/**
 * Deal of the day — the top row of the fixed nav, on every page that has one.
 *
 * ── IT TAKES ITSELF DOWN ─────────────────────────────────────────────────────
 * Pages render per request here (the layout reads the age-gate cookie), so after
 * `endsAt` the server simply stops sending it. That alone left a gap the last
 * timed banner (the ROVE pop-up) had: a page ALREADY OPEN at the deadline kept
 * showing an expired deal until the visitor navigated. So there is a timer too,
 * which removes the bar at the exact moment `endsAt` passes, and a countdown
 * that ticks toward it.
 *
 * ── WHY IT LIVES INSIDE THE NAV ──────────────────────────────────────────────
 * The nav is position:fixed, and pages clear it with hard-coded top padding
 * (.page / .menu-page: 70px). Sat above the nav, the bar would sit under it or
 * push it off the top; made part of the nav, it stays pinned while scrolling and
 * can't overlap anything. The one cost — a taller nav covering the top of each
 * page — is paid back in globals.css: `body:has(.dealbar)` adds exactly the
 * bar's height as top padding, and only while the bar exists. When it ends, the
 * padding goes with it, with no JavaScript measuring anything.
 *
 * Not on the kiosk: its shop takes over the whole screen, and it already shows
 * this deal in its own Today's Deals row. Signage pages have no nav, so no bar.
 *
 * Nothing is shown before the 21+ gate is passed: the gate hides every body
 * child until then (globals.css, html:not([data-age="ok"])).
 *
 * Hydration: the countdown text is rendered on the server and again on the
 * client, which can differ by a minute across a minute boundary — a timestamp,
 * the case suppressHydrationWarning exists for. The mount effect then sets the
 * clock from the client immediately.
 */

const END = dealOfTheDay ? new Date(dealOfTheDay.endsAt).getTime() : 0;

/** "8h 59m", "45m", "under 1m" — minutes are the finest grain worth showing. */
function remaining(ms: number) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "under 1m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DealBanner() {
  const path = usePathname() ?? "";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now()); // take the client's clock straight away
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    // Hard stop at the deadline itself, not up to 30s after it.
    const left = END - Date.now();
    const stop = left > 0 ? setTimeout(() => setNow(Date.now()), left + 50) : undefined;
    return () => {
      clearInterval(tick);
      if (stop) clearTimeout(stop);
    };
  }, []);

  if (!dealOfTheDay || now >= END || path.startsWith("/kiosk")) return null;

  const d = dealOfTheDay;
  const left = remaining(END - now);

  return (
    <a
      className="dealbar"
      href={d.href}
      aria-label={`Deal of the day: ${d.title}, ${d.offer}. Today only, ends ${d.endsLabel}.`}
    >
      <span className="dealbar-tag">
        <span className="dealbar-dot" aria-hidden="true" />
        <span className="dealbar-wide">Deal of the day</span>
        <span className="dealbar-narrow">Today</span>
      </span>

      <span className="dealbar-deal">
        <b>{d.title}</b>
        <span className="dealbar-offer dealbar-wide">{d.offer}</span>
        <span className="dealbar-offer dealbar-narrow">{d.offerShort}</span>
      </span>

      <span className="dealbar-time">
        <span className="dealbar-wide">Ends {d.endsLabel} ·&nbsp;</span>
        <span suppressHydrationWarning>{left}</span>
        <span className="dealbar-wide">&nbsp;left</span>
      </span>

      <span className="dealbar-cta" aria-hidden="true">
        <span className="dealbar-wide">Shop now&nbsp;</span>→
      </span>
    </a>
  );
}
