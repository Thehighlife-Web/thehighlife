import { heroPromo } from "@/data/site";

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
