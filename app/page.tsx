import ScrollEffects from "./components/ScrollEffects";
import Nav from "./components/Nav";
import StoreTour from "./components/StoreTour";
import { Marquee, DealsBand } from "./components/Deals";
import LiveShelf from "./components/LiveShelf";
import Categories from "./components/Categories";
import Stats from "./components/Stats";
import Visit from "./components/Visit";
import Footer from "./components/Footer";

export default function Page() {
  return (
    <>
      {/* wires up the scroll rail, hero parallax, reveals, count-ups and pinned gallery */}
      <ScrollEffects />
      <div className="rail" id="rail" />
      <Nav />
      {/* The video IS the top of the page. The old <Hero /> — storefront photo,
          headline and the Grand Opening banner — was taken out on Elijah's ask;
          components/Hero.tsx is still there if it's ever wanted back. */}
      <StoreTour />
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
