import { getOnSaleProducts } from "@/lib/onsale";
import LiveShopRow from "./LiveShopRow";

/**
 * "Live From The Shelf" — the homepage's live product row, with tabs for what to
 * show: what's on sale, a category, or top sellers (see LiveShopRow).
 *
 * Complements the deals band above rather than repeating it: that one shows
 * coupon artwork ("B1G1"), this shows real products at real prices, with Add.
 *
 * The heading and lead are rendered here on the server so they're in the HTML
 * straight away; the tabs, the "View All" link and the tiles come from the shop
 * once it loads. The server-side feed (lib/onsale.ts) is used for one decision
 * only: whether there's anything on sale today, which decides if the On Sale tab
 * is offered at all.
 */
export default async function LiveShelf() {
  const onSale = await getOnSaleProducts();

  return (
    <section className="onsale" id="onsale">
      <div className="wrap onsale-wrap">
        <div className="onsale-head">
          <h2>
            Live From
            <br />
            The Shelf
          </h2>
        </div>

        <p className="onsale-lead">
          Straight from the register — what&rsquo;s marked down, what&rsquo;s selling, and each
          shelf in turn. Add to your cart right here. Prices exclude tax, while supplies last.
        </p>

        <LiveShopRow hasOnSale={onSale.length > 0} />
      </div>
    </section>
  );
}
