import { getSaleShelf } from "@/lib/onsale";
import SaleShelf from "./SaleShelf";

/**
 * The homepage's On Sale shelf (it was "Live From The Shelf").
 *
 * Complements the deals band above rather than repeating it: that one shows
 * coupon artwork ("B1G1"), this shows the actual products that are cheaper today,
 * with the percent off and the price — tabbed by category.
 *
 * All of it is rendered here on the server from lib/onsale.ts, so it's in the HTML
 * straight away and the homepage no longer loads JSCart at all. When nothing is on
 * sale (or Proteus can't be reached) the whole section is left out rather than
 * showing an empty shelf.
 */
export default async function LiveShelf() {
  const { all, tabs } = await getSaleShelf();
  if (!all.length) return null;

  return (
    <section className="onsale" id="onsale">
      <div className="wrap onsale-wrap">
        <div className="onsale-head">
          <h2>
            On Sale
            <br />
            Right Now
          </h2>
        </div>

        <p className="onsale-lead">
          Marked down today, straight from the register. Tap anything to see it in the shop and add
          it to your cart. Prices exclude tax, while supplies last.
        </p>

        <SaleShelf all={all} tabs={tabs} />
      </div>
    </section>
  );
}
