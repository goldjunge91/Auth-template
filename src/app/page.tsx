import Html from "@/components/blocks/hero-futuristic";
import TestimonialsLoader from "@/components/blocks/testimonials-loader"; // Importiere die neue Ladekomponente

export default function Home() {
  return (
    <>
      <Html />
      <TestimonialsLoader /> {/* Verwende die neue Ladekomponente */}
    </>
  );
}
