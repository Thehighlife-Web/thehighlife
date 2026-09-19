import Image from "next/image";
import { getShopDeals, listOtherDeals, pickFeaturedDeal } from "@/lib/deals";

/**
 * Homepage deals section: a scrolling marquee + a bold band with ONE featured
 * deal picture and a small row of the other deals under it. No hand-kept deal
 * artwork lives here — every picture is the deal's own artwork, pulled live from
 * Proteus.
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

const nameOf = (d: { name?: string; message?: string }) => d.name || d.message || "this deal";

/**
 * The homepage deals moment: the heading, the two ways in, one big picture — the
 * featured deal — and a small scrolling row of every other live deal.
 *
 * Which deal is featured is decided per request by pickFeaturedDeal (lib/deals):
 * the deal pinned in data/site.ts (`featuredDeal`) until its end time, then the
 * NEWEST deal in Proteus that has a picture. The row is everything else, newest
 * first. So a new deal uploaded with artwork shows up on its own, and nothing here
 * needs editing when a deal ends.
 *
 * Pictures go through next/image. Proteus's originals are full-size PNGs averaging
 * ~1.8MB; next/image serves a WebP at the size shown instead — measured at 5–9KB
 * per 150px preview and 28–60KB for the featured picture. That's what makes a row
 * of 30-odd pictures affordable on a phone. Allow-listed in next.config.ts. Lazy by
 * default.
 *
 * If Proteus can't be reached there are no pictures, and the band falls back to a
 * single column — heading and buttons — rather than showing broken images.
 */
export async function DealsBand() {
  const deals = await getShopDeals();
  const featured = pickFeaturedDeal(deals);
  const others = listOtherDeals(deals, featured);

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

        {featured?.image && (
          <div className="dealfeature-col">
            <a
              className="dealfeature"
              href={`/menu#view=products&coupon=${featured.id}`}
              aria-label={`Featured deal: ${nameOf(featured)}. Shop it`}
            >
              <Image src={featured.image} alt={nameOf(featured)} fill sizes="(max-width: 960px) 92vw, 600px" />
            </a>

            {others.length > 0 && (
              <div className="dealthumbs" role="region" aria-label="More deals">
                {others.map((d) =>
                  d.image ? (
                    <a
                      key={String(d.id)}
                      className="dealthumb"
                      href={`/menu#view=products&coupon=${d.id}`}
                      aria-label={`Shop ${nameOf(d)}`}
                    >
                      {/* Fixed size, NOT fill + sizes: a fixed width gives a 2-entry
                          srcset (1x/2x). `sizes` made Next list all 15 widths for every
                          preview — ~100KB of extra page HTML across 30-odd previews. */}
                      <Image src={d.image} alt={nameOf(d)} width={150} height={84} />
                    </a>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
