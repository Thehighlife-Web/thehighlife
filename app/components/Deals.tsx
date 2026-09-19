import { getShopDeals, pickFeaturedDeal } from "@/lib/deals";

/**
 * Homepage deals section: a scrolling marquee + a bold band with ONE featured
 * deal picture that routes into the menu. No hand-kept deal artwork lives here —
 * the picture is the deal's own artwork, pulled live from Proteus.
 */

export function Marquee() {
  // Generic, always-true energy — no specific brand/percent claims that could go stale.
  const unit = (
    <span>
      Deals Deals Deals <em className="sep">✦</em> BOGO All Week <em className="sep">✦</em> 2 For $40
      <em className="sep">✦</em> 25% Off <em className="sep">✦</em> Bundles <em className="sep">✦</em>
      Fresh Markdowns <em className="sep">✦</em>
    </span>
  );
  return (
    <div className="marquee" aria-hidden="true">
      {/* duplicated so the loop is seamless */}
      <div className="mtrack">
        {unit}
        {unit}
      </div>
    </div>
  );
}

/**
 * The homepage deals moment: the heading, the two ways in, and one big picture —
 * the featured deal.
 *
 * Which deal is featured is decided per request by pickFeaturedDeal (lib/deals):
 * the deal pinned in data/site.ts (`featuredDeal`) until its end time, then the
 * NEWEST deal in Proteus that has a picture. So a new deal uploaded with artwork
 * takes over on its own, and nothing here needs editing when a deal ends.
 *
 * If Proteus can't be reached there's no picture, and the band falls back to a
 * single column — heading and buttons — rather than showing a broken image.
 */
export async function DealsBand() {
  const featured = pickFeaturedDeal(await getShopDeals());
  const label = featured ? featured.name || featured.message || "this deal" : "";

  return (
    <section className="deals-band" id="deals">
      <div className={`wrap${featured ? " deals-band-grid" : ""}`}>
        <div className="deals-band-copy">
          <h2 className="reveal">
            This Week&rsquo;s
            <br />
            Deals
          </h2>

          <div className="page-cta reveal">
            <a className="btn primary" href="/deals">
              See This Week&rsquo;s Deals →
            </a>
            <a className="btn ghost" href="/menu">
              Shop The Menu
            </a>
          </div>
        </div>

        {featured && (
          <a
            className="dealfeature"
            href={`/menu#view=products&coupon=${featured.id}`}
            aria-label={`Featured deal: ${label}. Shop it`}
          >
            {/* Proteus-hosted artwork; next/image would need their host allow-listed and
                re-encodes nothing we control. Width/height reserve the 16:9 box. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featured.image} alt={label} width={1600} height={900} loading="lazy" decoding="async" />
          </a>
        )}
      </div>
    </section>
  );
}
