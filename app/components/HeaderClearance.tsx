"use client";

import { useEffect } from "react";

/**
 * Publishes the fixed header's real height as --hl-header on <html>, so
 * whatever sits at the top of the page can reserve exactly that much room.
 *
 * ⚠️ MEASURED, never typed. The header's height changes with what's in it — the
 * announcement line, the deal strip appearing and disappearing as deals end, the
 * logo shrinking on small screens. It was once hard-coded at 129px, and the day
 * the announcement strip went in the real height became 161px and the nav sat
 * straight on top of the video.
 *
 * This used to live inside StoreTour, which was fine while the video was always
 * first. It isn't any more — a brand banner can sit above it — so the
 * measurement moved out here and the clearance goes on the wrapper that holds
 * them both (.below-header). Reordering what's inside that wrapper now changes
 * nothing about the spacing.
 *
 * Renders nothing. The CSS fallbacks in globals.css cover the instant before
 * this runs, and JavaScript being off.
 */
export default function HeaderClearance() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    if (!nav) return;

    const apply = () => {
      const h = Math.round(nav.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty("--hl-header", `${h}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(nav);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--hl-header");
    };
  }, []);

  return null;
}
