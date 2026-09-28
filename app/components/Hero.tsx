import Image from "next/image";
import banner from "@/public/images/grand-opening-hero.webp";
import { activeHeroPromo } from "@/lib/promo";

/**
 * The homepage hero.
 *
 * While a campaign is running (heroPromo in data/site.ts) the banner takes the
 * place of the eyebrow + headline + sub-line; the storefront photo, the buttons
 * and the scroll cue stay put. ⚠️ IT PUTS ITSELF BACK at heroPromo.endsAt — the
 * page renders per request (the layout reads the age-gate cookie), so the date is
 * checked on every visit rather than baked in at build time.
 *
 * The banner is a static import so next/image knows its size (no layout jump) and
 * re-encodes it for the screen it lands on. `preload` because it's the biggest
 * thing above the fold — `priority` is deprecated in Next 16 (see
 * node_modules/next/dist/docs, image.md).
 */
export default function Hero() {
  const promo = activeHeroPromo();

  return (
    <header className="hero" id="top">
      <div
        className="hero-photo"
        style={{ backgroundImage: "url('/images/storefront.webp')" }}
        role="img"
        aria-label="The High Life Dispensary storefront on Wellwood Ave, West Babylon"
      />
      <canvas id="smoke" />
      <div className="hero-overlay" />
      <div className="hero-inner" id="heroInner">
        {promo ? (
          <Image className="hero-promo" src={banner} alt={promo.alt} sizes="(max-width: 1180px) 92vw, 1080px" preload />
        ) : (
          <>
            <div className="eyebrow">Licensed New York Adult-Use Dispensary</div>
            <h1 className="hero-h1">
              West Babylon&rsquo;s
              <br />
              <span className="g">Neighborhood Dispensary</span>
            </h1>
            <p className="hero-sub">
              Your neighborhood dispensary in New York. The brands you love, tested and shelf-ready
              — with fresh deals dropping every single week.
            </p>
          </>
        )}
        <div className="hero-cta">
          <a className="btn primary" href="#deals">
            See This Week&rsquo;s Deals →
          </a>
          <a className="btn ghost" href="#shop">
            Shop by Category
          </a>
        </div>
      </div>
      <div className="scrollcue">
        <span>Scroll</span>
        <span className="dot" />
      </div>
    </header>
  );
}
