"use client";

import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

const testimonialsData = [
  {
    quote:
      "Diese Plattform hat die Art und Weise, wie wir Software entwickeln, revolutioniert. Die KI-gestützten Tools sind unglaublich leistungsstark und intuitiv.",
    name: "Sarah Müller",
    designation: "CEO, Tech Solutions GmbH",
    src: "https://i.pravatar.cc/150?img=1", // Beispielbild
  },
  {
    quote:
      "Ich bin beeindruckt von der Geschwindigkeit und Effizienz. Die Integration in unsere bestehenden Workflows war nahtlos.",
    name: "Max Mustermann",
    designation: "Lead Developer, Innovate AG",
    src: "https://i.pravatar.cc/150?img=2", // Beispielbild
  },
  {
    quote:
      "Ein Game-Changer für unser Team. Wir können jetzt Prototypen in Rekordzeit erstellen und schneller auf Marktveränderungen reagieren.",
    name: "Anna Schmidt",
    designation: "Projektmanagerin, Future Creations",
    src: "https://i.pravatar.cc/150?img=3", // Beispielbild
  },
  {
    quote:
      "Die Benutzeroberfläche ist sehr benutzerfreundlich und das Onboarding war ein Kinderspiel. Sehr zu empfehlen!",
    name: "Jonas Weber",
    designation: "CTO, Startup X",
    src: "https://i.pravatar.cc/150?img=4", // Beispielbild
  },
];

const Testimonials = () => {
  return (
    <div className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900 dark:text-gray-50">
              Das sagen unsere Kunden
            </h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Hören Sie von Entwicklern und Unternehmen, die unsere Plattform nutzen, um ihre Projekte auf die nächste Stufe zu heben.
            </p>
          </div>
        </div>
        <AnimatedTestimonials testimonials={testimonialsData} autoplay={true} />
      </div>
    </div>
  );
};

export default Testimonials;
