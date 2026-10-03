"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The store walkthrough that opens the homepage.
 *
 * Shot in the shop, with its own captions burned into the picture ("BUY 1 GET 1
 * FOR A PENNY DEALS!", "FLOWER, PREROLLS, CARTS, VAPES"). Two things follow from
 * that, and both are deliberate:
 *
 *  1. NOTHING OF OURS GOES ON TOP OF IT. The video already carries its message;
 *     a headline over it would collide with the captions.
 *  2. IT IS NEVER CROPPED. Those captions run edge to edge, so the usual
 *     full-bleed trick (object-fit:cover on a fixed height) would slice the
 *     first and last words off. It plays at its natural 16:9 instead — full
 *     width, height follows — see .storetour in globals.css.
 *
 * Silent by design: the source has an audio track, but it is digital silence
 * (-91 dB), so it was stripped on encode. There is no mute button because there
 * is nothing to mute.
 *
 * ── WHY PLAYBACK STARTS HERE RATHER THAN WITH THE autoplay ATTRIBUTE ──────────
 * Two groups should not be handed 5MB of looping video unasked: people who have
 * asked their system for less motion, and people on a metered or data-saving
 * connection. The attribute would start before any of that could be checked, so
 * the effect starts it instead, and those two cases get the poster and a Play
 * button. If the browser refuses to autoplay anyway, that same button appears —
 * so a blocked autoplay looks intentional rather than broken.
 */
const SRC = "/video/store-tour-1280.mp4";
const POSTER = "/images/store-tour-poster.webp";

/** A connection the visitor is paying for by the megabyte, or has asked to spare. */
function savingData(): boolean {
  const c = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!c) return false;
  return c.saveData === true || c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

export default function StoreTour() {
  const ref = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* older browsers: treat as no preference */
    }

    if (reduced || savingData()) {
      setNeedsTap(true);
      return;
    }

    // play() rejects when the browser blocks autoplay (and on some phones in
    // low-power mode). Either way the poster is already on screen, so all that
    // is needed is the button.
    video.play().catch(() => setNeedsTap(true));
  }, []);

  const start = () => {
    setNeedsTap(false);
    ref.current?.play().catch(() => setNeedsTap(true));
  };

  return (
    // id="top" moved here from the old hero — it's what the footer's
    // "Back to top" link points at, and this is the top of the page now.
    <section id="top" className="storetour" aria-label="A walk through The High Life Dispensary">
      <div className="storetour-frame">
        <video
          ref={ref}
          src={SRC}
          poster={POSTER}
          muted
          loop
          playsInline
          preload="metadata"
        />
        {needsTap && (
          <button type="button" className="storetour-play" onClick={start}>
            <span aria-hidden="true">▶</span>
            Play the store tour
          </button>
        )}
      </div>
    </section>
  );
}
