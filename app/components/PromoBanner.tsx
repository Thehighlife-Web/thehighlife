import Image from "next/image";
import banner from "@/public/images/vitabudz-bogo.png";
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
 * ⚠️ IT IS NEVER STRETCHED PAST ITS OWN WIDTH. The current artwork is a 728x90
 * web-ad leaderboard; run full-bleed it would be a 2x upscale on a laptop and
 * 4x on a retina screen, which turns brand artwork to mush. The CSS caps it at
 * its natural width and centres it, so it is only ever scaled DOWN (on phones,
 * where it lands sharp). Supply artwork around 1920px wide and it fills the
 * screen the way the previous banner did — the cap is on the image, so a bigger
 * file needs no code change beyond the max-width.
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
      <Image src={banner} alt={promoBanner.alt} sizes="(max-width: 728px) 100vw, 728px" preload />
    </a>
  );
}
