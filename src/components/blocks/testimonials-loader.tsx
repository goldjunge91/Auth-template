"use client";

import dynamic from 'next/dynamic';

const Testimonials = dynamic(() => import('./testimonials'), {
  ssr: false,
  // Optional: Ladekomponente anzeigen, während Testimonials geladen wird
  // loading: () => <p>Loading testimonials...</p>,
});

export default function TestimonialsLoader() {
  return <Testimonials />;
}
