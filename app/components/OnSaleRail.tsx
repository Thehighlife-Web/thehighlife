import { getOnSaleProducts } from "@/lib/onsale";
import OnSaleShop from "./OnSaleShop";

/**
 * "On Sale Right Now" — everything currently marked down, biggest saving first,
 * as real JSCart product tiles with working Add buttons (see OnSaleShop).
 *
 * Complements the deals band above rather than repeating it: that one shows
 * coupon artwork ("B1G1"), this shows real products at real prices.
 *
 * The heading and "View All On Sale" button are rendered here on the server so
 * they're in the HTML straight away; the tiles come from the shop once it loads.
 * The server-side feed (lib/onsale.ts) is only used to decide whether to show the
 * section at all: if nothing is on sale — or Proteus can't be reached — the whole
 * section is left out rather than showing an empty row.
 */
export default async function OnSaleRail() {
  const products = await getOnSaleProducts();
  if (products.length === 0) return null;

  return (
    <section className="onsale" id="onsale">
      <div className="wrap onsale-wrap">
        <div className="onsale-head">
          <h2>
            On Sale
            <br />
            Right Now
          </h2>
          <a className="btn ghost onsale-all" href="/menu#view=products&onsale=1">
            View All On Sale →
          </a>
        </div>

        <p className="onsale-lead">
          Live markdowns from the register, biggest savings first. Add to your cart right here.
          Prices exclude tax, while supplies last.
        </p>

        <OnSaleShop />
      </div>
    </section>
  );
}
