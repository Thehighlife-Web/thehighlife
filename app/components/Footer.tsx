import { store } from "@/data/site";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-title reveal">
          <span className="a">Live The</span>
          <span className="b">High Life</span>
        </div>
        <div className="footmeta">
          <span>
            {/* Tapping the address opens directions — on a phone, in the Maps app. */}
            <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer">
              {store.addressLine1}, {store.addressLine2}
            </a>
          </span>
          <span>
            <a href={`mailto:${store.email}`}>{store.email}</a>
          </span>
          <span>
            <a href="#top">Back to top ↑</a>
          </span>
        </div>
        <div className="footlinks" role="navigation" aria-label="Legal">
          <a href="/about">About</a>
          <a href="/visit">Visit</a>
          <a href="/faq">FAQ</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
        <p
          style={{
            marginTop: 28,
            color: "var(--muted)",
            fontSize: 12,
            maxWidth: "70ch",
            marginLeft: "auto",
            marginRight: "auto",
            fontFamily: "var(--mono)",
            lineHeight: 1.7,
          }}
        >
          {store.legal}
        </p>
      </div>
    </footer>
  );
}
