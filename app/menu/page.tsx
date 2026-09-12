import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import ProteusShop from "../components/ProteusShop";
import MenuDealsMore from "../components/MenuDealsMore";
import { PROTEUS_STOCK } from "@/data/proteus-stock";

export const metadata: Metadata = {
  title: "Menu | The High Life Dispensary",
  description:
    "Shop the live menu at The High Life Dispensary in West Babylon, NY — pickup or delivery, pay online or in store. 21+.",
};

/**
 * THE shop. This is Proteus's JSCart (real cart, checkout, accounts, delivery,
 * ID verification, payments) embedded in our site and skinned to the brand.
 * The old custom menu + reserve-for-pickup cart were retired in favor of this
 * single system — see app/components/ProteusShop.tsx.
 */
export default function MenuPage() {
  return (
    <>
      <div className="rail" id="rail" />
      <Nav />

      <section className="page">
        <div className="wrap order-wrap">
          {/* Our "View All Deals" button — off while running stock Proteus. */}
          {!PROTEUS_STOCK && <MenuDealsMore />}
          <ProteusShop />
        </div>
      </section>

      <Footer />
    </>
  );
}
