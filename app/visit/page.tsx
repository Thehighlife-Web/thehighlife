import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import Hours from "../components/Hours";
import { store } from "@/data/site";
import StoreMap from "../components/StoreMap";

export const metadata: Metadata = {
  title: "Visit Us | The High Life Dispensary",
  description:
    "Visit The High Life Dispensary at 1300 Wellwood Ave, West Babylon NY 11704. Open 7 days. 21+ with valid ID.",
};

export default function VisitPage() {
  return (
    <>
      <div className="rail" id="rail" />
      <Nav />

      <section className="page">
        <div className="wrap">
          <h2>Visit The Shop</h2>
          <p className="page-lead">
            We&rsquo;re on Wellwood Ave with parking on site. Walk in, take your time, ask
            questions — that&rsquo;s what we&rsquo;re here for.
          </p>

          <div className="visit-grid">
            <Hours />

            <div className="addr">
              <div className="big">
                <a
                  className="addr-link"
                  href={store.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Get directions to ${store.addressLine1}, ${store.addressLine2}`}
                >
                  {store.addressLine1}
                  <br />
                  {store.addressLine2}
                </a>
              </div>
              <p>
                Look for the green neon leaf. Bring a valid, government-issued photo ID every
                visit — no exceptions, and no medical card needed for adult-use.
              </p>

              <div className="visit-photo" />

              <StoreMap className="visit-map" />

              <div className="page-cta" style={{ marginTop: 0 }}>
                <a
                  className="btn primary"
                  href={store.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions →
                </a>
                <a className="btn ghost" href={`mailto:${store.email}`}>
                  Email Us
                </a>
              </div>
            </div>
          </div>

          <div className="infocards">
            <div className="infocard">
              <h3>What To Bring</h3>
              <p>
                A valid government-issued photo ID showing you&rsquo;re 21 or older — driver&rsquo;s
                license, passport, or state ID. We check every visit, every time.
              </p>
            </div>
            <div className="infocard">
              <h3>How To Pay</h3>
              <p>
                Payment happens in store at the counter. Check the live menu before you come so you
                know what&rsquo;s in stock and what it costs.
              </p>
            </div>
            <div className="infocard">
              <h3>First Time?</h3>
              <p>
                Say so at the counter. We&rsquo;ll walk you through the menu, explain the
                difference between products, and start you somewhere sensible.
              </p>
            </div>
          </div>

          <div className="contactline">
            <span>
              <b>Email</b>{" "}
              <a href={`mailto:${store.email}`}>{store.email}</a>
            </span>
            <span>
              <b>Address</b> {store.addressLine1}, {store.addressLine2}
            </span>
            <span>
              <b>NYS OCM#</b> {store.license}
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
