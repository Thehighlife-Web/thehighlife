import { eventStrip, heroPromo } from "@/data/site";

/**
 * Is the campaign still on?
 *
 * The clock is read HERE rather than inside the component: React's purity rule
 * (react-hooks/purity) rightly objects to Date.now() during render, since a
 * re-render could produce a different answer. The pages that use this render per
 * request anyway (the layout reads the age-gate cookie), so the end time is
 * checked on every visit rather than baked in at build time.
 */
export function activeHeroPromo(now: number = Date.now()) {
  if (!heroPromo) return null;
  return now < new Date(heroPromo.endsAt).getTime() ? heroPromo : null;
}

/**
 * The event lines for the scrolling strip, or null once the event is over.
 *
 * Same reasoning as above: the clock is read here, not during render, and the
 * homepage renders per request — so the strip drops back to its standing deal
 * lines on the first visit after `endsAt` with nothing to remember.
 */
export function activeEventStrip(now: number = Date.now()) {
  if (!eventStrip || eventStrip.lines.length === 0) return null;
  return now < new Date(eventStrip.endsAt).getTime() ? eventStrip : null;
}
