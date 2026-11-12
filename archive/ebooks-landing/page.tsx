import Hero from "@/components/Hero";
import Promesse from "@/components/Promesse";
import Livres from "@/components/Livres";
import ParallaxVisual from "@/components/ParallaxVisual";
import CTA from "@/components/CTA";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <Promesse />
      <Livres />
      <ParallaxVisual />
      <CTA />
    </main>
  );
}
