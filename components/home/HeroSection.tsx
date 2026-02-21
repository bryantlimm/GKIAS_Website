// components/home/HeroSection.tsx
'use client'; // <-- Required for state and intervals

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

interface HeroProps {
  heroTitle: string;
  heroImageUrls: string[]; // <-- Changed to array
  schedules: Schedule[];
}

export default function HeroSection({ heroTitle, heroImageUrls, schedules }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play interval
  useEffect(() => {
    if (!heroImageUrls || heroImageUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImageUrls.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [heroImageUrls]);

  // Fallback in case no images exist
  // const displayImages = heroImageUrls?.length > 0 ? heroImageUrls : ['/placeholder-hero.jpg'];
  const displayImages = Array.isArray(heroImageUrls) 
  ? heroImageUrls 
  : (typeof heroImageUrls === 'string' && heroImageUrls !== '' 
      ? [heroImageUrls] 
      : ['/placeholder-hero.jpg']);

  return (
    <section className="relative h-[60vh] md:h-[87vh] flex items-center justify-center text-white overflow-hidden">
      
      {/* Background Carousel Images */}
      {displayImages.map((url, index) => (
        <div 
          key={url + index}
          className={`absolute inset-0 transition-opacity duration-1500 ease-out ${
            index === currentSlide ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          }`}
        >
          <Image
            src={url}
            alt={`GKIAS Background ${index + 1}`}
            fill
            style={{ objectFit: 'cover' }}
            priority={index === 0}
          />
        </div>
      ))}

      {/* Dark Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black opacity-50 z-10"></div>
      
      {/* Carousel Indicators (Dots at the bottom) */}
      {/* {displayImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )} */}
      
      {/* Content Container (z-index 20) */}
      <div className="relative z-20 max-w-6xl mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Title (Left Side) */}
        <div className="md:w-1/2 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight shadow-text">
            {heroTitle}
          </h1>
        </div>

        {/* Services Schedule (Right Side) */}
        {/* <div className="md:w-1/2 bg-white/90 p-6 md:p-8 rounded-xl shadow-2xl text-blue-900">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-200 pb-2">Jadwal Kebaktian</h2>
          <ul className="space-y-3">
            {schedules.map((s) => (
              <li key={s.id} className="flex justify-between text-base md:text-xl"> 
                <span className="font-semibold text-sm md:text-lg">{s.name}</span>
                <span className="font-medium text-blue-700 text-base md:text-xl">{s.time}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-center">
            <Link href="/kebaktian" className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300">
              View More &rarr;
            </Link>
          </div>
        </div> */}

      </div>
    </section>
  );
}