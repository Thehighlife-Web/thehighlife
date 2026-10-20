import Image from "next/image";
import banner from "@/public/images/vitabudz-bogo.webp";
import { promoBanner } from "@/data/site";

/**
 * A full-width brand banner at the top of the homepage, linking into the menu
 * filtered to that deal.
 *
 * The artwork is a static import so next/image knows its real size, never jumps
 * the layout, and re-encodes it for the screen it lands on. `preload` because
 * when this sits above the video it is the first thing on the page —
 * `priority` is deprecated in Next 16 (node_modules/next/dist/docs, image.md).
 *
 * ⚠️ THE CURRENT ARTWORK WAS ENLARGED BEFORE IT GOT HERE. VitaBudz supplied a
 * 728x90 web-ad leaderboard, which is far too small to run edge to edge — the
 * browser would have stretched it ~2x on a laptop and ~4x on a retina phone,
 * which turns brand artwork to mush. public/images/vitabudz-bogo.webp is that
 * file resampled to 1920x237 with lanczos, which holds up because the artwork
 * is large bold type on a gradient; fine detail would not have survived it.
 *
 * So: ASK THE BRAND FOR ARTWORK AT ~1920px WIDE. When it arrives, drop it in
 * and nothing else changes. Enlarging a small file is a rescue, not the plan.
 *
 * ⚠️ The link is a COUPON filter, not a category: /menu#view=products&coupon=7
 * is what JSCart's own deal cards use, and 7 is the id Proteus gives
 * "Brass Knuckles 510 and AIO BOGO" in its deals feed. If the deal is rebuilt in
 * Proteus it gets a NEW id and this link quietly shows the wrong shelf — so
 * check the id, not just that the page loads, whenever the artwork changes.
 *
 * Returns nothing when promoBanner is null, so taking it down is one edit in
 * data/site.ts.
 */
export default function PromoBanner() {
  if (!promoBanner) return null;

  return (
    <a className="promobanner" href={promoBanner.href} aria-label={promoBanner.alt}>
      <Image src={banner} alt={promoBanner.alt} sizes="100vw" preload />
    </a>
  );
}
