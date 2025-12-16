// components/HeroSection.tsx
"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export default function HeroSection() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  const slides = [
    {
      bgImage: "url('/hero-bg-1.jpg')",
      title: "It's trading with a Plus",
      subtitle: "Cryptocurrencies",
      buttons: [
        { text: "Start Trading Now", primary: true },
        { text: "Try free demo", primary: false },
      ],
    },
    {
      bgImage: "url('/hero-bg-2.jpg')",
      title: "A world of opportunities with",
      subtitle: "Global Markets",
      buttons: [
        { text: "Discover Instruments", primary: true },
        { text: "Open Account", primary: false },
      ],
    },
  ];

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {slides.map((slide, index) => (
          <div className="flex-[0_0_100%] min-w-0 relative" key={index}>
            <div
                className="relative bg-cover bg-center h-[calc(100vh-4rem)] flex items-center"
                style={{ backgroundImage: slide.bgImage }}
            >
              <div className="absolute inset-0 bg-blue-900/60"></div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
                <div className="max-w-xl">
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                    {slide.title}
                  </h1>
                  <h2 className="text-blue-300 text-3xl font-bold sm:text-4xl md:text-5xl mt-2">
                    {slide.subtitle}
                  </h2>
                  <div className="mt-8 flex space-x-4">
                    {slide.buttons.map((btn, btnIndex) => (
                      <a
                        key={btnIndex}
                        href="#"
                        className={`px-8 py-3 rounded-md text-base font-medium ${
                          btn.primary
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-white text-blue-600 hover:bg-gray-100'
                        }`}
                      >
                        {btn.text}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}