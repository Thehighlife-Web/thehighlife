import { announceBar } from "@/data/site";

/**
 * The thin standing message pinned above everything — currently that delivery
 * now reaches Long Island and NYC.
 *
 * Lives INSIDE the fixed nav, above the deal strip, for the same reason the
 * deal strip does: the nav is position:fixed, so a bar sitting above it would
 * either be covered by it or push it off the top of the screen. As part of the
 * nav it stays pinned and can't overlap anything.
 *
 * A server component with no state — it's one line of copy from data/site.ts,
 * and nothing about it changes in the browser.
 *
 * ⚠️ It makes the fixed header taller, which matters to the homepage video
 * sitting directly beneath it. StoreTour measures the header rather than
 * assuming a height, so this can come and go freely.
 */
export default function AnnounceBar() {
  if (!announceBar) return null;

  return (
    <a className="announce" href={announceBar.href}>
      {announceBar.text}
    </a>
  );
}
