import { Fragment } from "react";
import Image from "next/image";
import { getShopDeals, listOtherDeals, pickFeaturedDeal } from "@/lib/deals";
import { activeEventStrip } from "@/lib/promo";

/**
 * Homepage deals section: a scrolling marquee + a bold band with ONE featured
 * deal picture and a small row of the other deals under it. No hand-kept deal
 * artwork lives here — every picture is the deal's own artwork, pulled live from
 * Proteus.
 */

/** Standing lines: always-true energy, no brand or percent claim that could go stale. */
const DEAL_LINES = [
  "Deals Deals Deals",
  "BOGO All Week",
  "2 For $40",
  "25% Off",
  "Bundles",
  "Fresh Markdowns",
];

/**
 * How long one trip round the strip should take.
 *
 * The animation moves the track a fixed fraction of its own width, so a FIXED
 * duration means more words scroll FASTER. Adding the Grand Opening lines nearly
 * doubled the content and would have doubled the speed. Working the seconds out
 * from the text length instead keeps the pace identical however much is on it —
 * the standing lines are ~68 characters and read nicely over 24s, which sets the
 * rate below.
 */
const SECONDS_PER_CHAR = 24 / 68;
const marqueeSeconds = (lines: string[]) =>
  Math.max(24, Math.round(lines.join("").length * SECONDS_PER_CHAR));

export function Marquee() {
  // The event goes in front of the standing lines, so the strip cycles through
  // what's on this weekend and then the usual deals, over and over. It drops out
  // by itself at eventStrip.endsAt (data/site.ts).
  const event = activeEventStrip();
  const lines = event ? [...event.lines, ...DEAL_LINES] : DEAL_LINES;

  const unit = (
    <span>
      {/* Fragment, not a wrapper element: the strip is a flex row whose spacing
          comes from `gap` between the text and the ✦ separators, so each line has
          to stay a bare text node beside its own ✦, exactly as before. */}
      {lines.map((line) => (
        <Fragment key={line}>
          {line} <em className="sep">✦</em>
        </Fragment>
      ))}
    </span>
  );

  return (
    // aria-hidden because the track is printed TWICE for the seamless loop, so a
    // screen reader would read the whole strip through twice. Nothing here is
    // only here: the event details are also in the pop-up's description, and the
    // deals are in the band below.
    <div className="marquee" aria-hidden="true">
      {/* duplicated so the loop is seamless */}
      <div className="mtrack" style={{ animationDuration: `${marqueeSeconds(lines)}s` }}>
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
