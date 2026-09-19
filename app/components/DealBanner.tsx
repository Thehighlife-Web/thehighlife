"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dealsOfTheDay } from "@/data/site";

/**
 * Deals of the day — the top row of the fixed nav, on every page that has one.
 *
 * ── ONE DEAL, OR SEVERAL TAKING TURNS ────────────────────────────────────────
 * One live deal is a still strip. Two or more take turns in the same strip, one
 * every ROTATE_MS. Side by side was measured and doesn't fit: with a single deal
 * a 320px phone has about 8px to spare, and a second deal needs ~130px more.
 *
 *  • It PAUSES while a pointer is over it, a finger is down on it, or it has
 *    keyboard focus — so a shopper can never aim at one deal and have the next
 *    one slide in under their tap.
 *  • Each deal keeps its own countdown and leaves at its own endsAt. When only
 *    one is left it stops turning and just sits there.
 *  • prefers-reduced-motion: no turning at all — the first live deal, still.
 *  • Only the contents fade on a swap, never the bar itself, so nothing behind it
 *    flashes (see .dealbar-rotating in globals.css).
 *
 * ── IT TAKES ITSELF DOWN ─────────────────────────────────────────────────────
 * Pages render per request here (the layout reads the age-gate cookie), so after
 * a deal's `endsAt` the server simply stops sending it. That alone left a gap the
 * last timed banner (the ROVE pop-up) had: a page ALREADY OPEN at the deadline
 * kept showing an expired deal until the visitor navigated. So there is a timer
 * per deal too, which drops it at the exact moment its `endsAt` passes, and a
 * countdown that ticks toward it.
 *
 * ── WHY IT LIVES INSIDE THE NAV ──────────────────────────────────────────────
 * The nav is position:fixed, and pages clear it with hard-coded top padding
 * (.page / .menu-page: 70px). Sat above the nav, the bar would sit under it or
 * push it off the top; made part of the nav, it stays pinned while scrolling and
 * can't overlap anything. The one cost — a taller nav covering the top of each
 * page — is paid back in globals.css: `body:has(.dealbar)` adds exactly the
 * bar's height as top padding, and only while the bar exists. When the last deal
 * ends, the padding goes with it, with no JavaScript measuring anything.
 *
 * Not on the kiosk: its shop takes over the whole screen, and it already shows
 * these deals in its own Today's Deals row. Signage pages have no nav, so no bar.
 *
 * Nothing is shown before the 21+ gate is passed: the gate hides every body
 * child until then (globals.css, html:not([data-age="ok"])).
 *
 * Hydration: the server and the first client render both show the FIRST live
 * deal, so they match. The countdown text can differ by a minute across a
 * minute boundary — a timestamp, the case suppressHydrationWarning exists for.
 */

const DEALS = dealsOfTheDay.map((d) => ({ ...d, end: new Date(d.endsAt).getTime() }));

/** How long each deal stays up before the next one takes its turn. */
const ROTATE_MS = 6000;

/** "3d 2h", "8h 59m", "45m", "under 1m". Past a day, minutes are noise — and
 *  "74h 12m" is hard to read at a glance. */
function remaining(ms: number) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "under 1m";
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DealBanner() {
  const path = usePathname() ?? "";
  const [now, setNow] = useState(() => Date.now());
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  // The clock: a tick every 30s for the countdown, and a hard stop at each deal's
  // own deadline. (No setNow on mount: useState's initializer already ran on the
  // client during hydration, so `now` is the client's clock from the first render.)
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const stops = DEALS.map((d) => d.end - Date.now())
      .filter((left) => left > 0)
      .map((left) => setTimeout(() => setNow(Date.now()), left + 50));
    return () => {
      clearInterval(tick);
      stops.forEach(clearTimeout);
    };
  }, []);

  // Reduced motion: follow the setting live, in case it's changed with the page open.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const live = DEALS.filter((d) => now < d.end);
  const rotating = live.length > 1 && !still;

  useEffect(() => {
    if (!rotating || paused) return;
    const t = setInterval(() => setTurn((n) => n + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, [rotating, paused]);

  if (live.length === 0 || path.startsWith("/kiosk")) return null;

  const at = rotating ? turn % live.length : 0;
  const d = live[at];
  const left = remaining(d.end - now);
  const count = live.length > 1 ? ` ${at + 1} of ${live.length}` : "";

  return (
    <a
      // A new key per deal remounts the link on each swap, which replays the fade.
      key={d.href}
      className={rotating ? "dealbar dealbar-rotating" : "dealbar"}
      href={d.href}
      aria-label={`Deal of the day${count}: ${d.title}, ${d.offer}. Ends ${d.endsLabel}.`}
      onPointerEnter={() => setPaused(true)}
      onPointerDown={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="dealbar-tag">
        <span className="dealbar-dot" aria-hidden="true" />
        <span className="dealbar-wide">
          {live.length > 1 ? "Deals of the day" : "Deal of the day"}
          {live.length > 1 && (
            <span className="dealbar-count">
              {" "}
              {at + 1}/{live.length}
            </span>
          )}
        </span>
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
