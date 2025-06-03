import Html from "@/components/blocks/hero-futuristic";
import TestimonialsLoader from "@/components/blocks/testimonials-loader"; // Importiere die neue Ladekomponente

/**
 * This is the main homepage component.
 * @remarks
 * TODO: Add more sections to the homepage, such as a features section or a call to action.
 */
export default function Home() {
  return (
    <>
      <Html />
      {/**
       * TestimonialsLoader is a component that dynamically loads and displays testimonials.
       * It might fetch testimonials from an API or a static data source.
       */}
      <TestimonialsLoader /> {/* Verwende die neue Ladekomponente */}
    </>
  );
}
