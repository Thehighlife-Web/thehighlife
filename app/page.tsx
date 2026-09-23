import ScrollEffects from "./components/ScrollEffects";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
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
      <Hero />
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
