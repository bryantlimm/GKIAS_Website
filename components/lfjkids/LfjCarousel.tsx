// components/lfjkids/LfjCarousel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LfjCarouselProps {
  imageUrls: string[];
  cloudText: string;
}

export default function LfjCarousel({ imageUrls, cloudText }: LfjCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback if no images are uploaded yet
  const displayImages = imageUrls.length > 0 ? imageUrls : ['/image1.jpg'];

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [displayImages.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-8 z-10">
      {/* Main Carousel Container */}
      <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-gray-800 shadow-xl bg-white">
        <Image
          src={displayImages[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          fill
          className="object-cover transition-opacity duration-500"
        />
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {displayImages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              currentIndex === idx ? 'bg-gray-600 scale-110' : 'bg-gray-300'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* The Dynamic Cloud Overlap */}
      <div className="absolute -bottom-16 -right-12 md:-bottom-20 md:-right-16 w-64 md:w-80 aspect-[4/3] z-20 flex items-center justify-center pointer-events-none">
        <Image 
          src="/cloud.png" 
          alt="Cloud" 
          fill 
          className="object-contain z-10" 
        />
        {/* Cloud Text overlay */}
        <p className="relative z-20 text-center text-gray-800 font-serif italic text-sm md:text-lg whitespace-pre-wrap px-12 pt-4">
          {cloudText || "Join us every\nSunday 10am"}
        </p>
      </div>
    </div>
  );
}