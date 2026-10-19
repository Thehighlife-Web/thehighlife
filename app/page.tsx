import ScrollEffects from "./components/ScrollEffects";
import Nav from "./components/Nav";
import StoreTour from "./components/StoreTour";
import PromoBanner from "./components/PromoBanner";
import HeaderClearance from "./components/HeaderClearance";
import { Marquee, DealsBand } from "./components/Deals";
import LiveShelf from "./components/LiveShelf";
import Categories from "./components/Categories";
import Stats from "./components/Stats";
import Visit from "./components/Visit";
import Footer from "./components/Footer";

/**
 * ⚠️ Render on every request, don't bake this page at build time.
 *
 * Until now the root layout read the age-gate cookie, and awaiting cookies()
 * forced every route to render per request as a side effect. That cookie is
 * gone (the gate is per tab now), so this has to be asked for out loud.
 *
 * It matters because things on this page are supposed to take themselves down
 * on a date: the event lines in the scrolling strip (activeEventStrip), the
 * hero campaign (activeHeroPromo) and the featured deal (pickFeaturedDeal).
 * Built once, their end times would be frozen at build time and the site would
 * sit there advertising a weekend that has already gone.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      {/* wires up the scroll rail, hero parallax, reveals, count-ups and pinned gallery */}
      <ScrollEffects />
      <div className="rail" id="rail" />
      <Nav />
      {/* The top of the page. The wrapper reserves the fixed header's height, so
          the banner and the video can be swapped by moving one line and nothing
          else shifts. The old <Hero /> — storefront photo, headline and the
          Grand Opening banner — came out on Elijah's ask; components/Hero.tsx is
          still there if it's ever wanted back. */}
      <HeaderClearance />
      <div className="below-header">
        <PromoBanner />
        <StoreTour />
      </div>
      <Marquee />
      <DealsBand />
      {/* live markdowns, straight from the register */}
      <LiveShelf />
      <Categories />
      <Stats />
      <Visit />
      <Footer />
    </>
  );
}
