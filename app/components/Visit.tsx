import { store } from "@/data/site";
import StoreMap from "./StoreMap";
import Hours from "./Hours";

export default function Visit() {
  return (
    <section className="visit" id="visit">
      <div className="wrap">
        <h2 className="reveal">Visit The Shop</h2>
        <div className="visit-grid">
          <Hours />
          <div className="addr reveal">
            <div className="big">
              {/* The address itself opens directions, not just the button below it —
                  on a phone the address is the thing people reach for. */}
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
              Look for the green neon leaf. Come as you are — just bring a
              valid, government-issued 21+ ID every visit. No medical card
              required for adult-use.
              <br />
              <br />
              Questions?{" "}
              <a
                href={`mailto:${store.email}`}
                style={{ color: "var(--green)" }}
              >
                {store.email}
              </a>
            </p>
            <StoreMap />
            <a
              className="btn ghost"
              style={{ alignSelf: "flex-start" }}
              href={store.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
