// components/home/PhotoSection.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PhotoSectionProps {
  title?: string;
  description?: string;
  imageUrls?: string[];
}

export default function PhotoSection({ title, description, imageUrls = [] }: PhotoSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Auto-play interval
  useEffect(() => {
    if (!imageUrls || imageUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % imageUrls.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [imageUrls]);

  // Parallax effect - track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fallback if no images are uploaded yet
  const displayImages = imageUrls.length > 0 ? imageUrls : ['/placeholder-hero.jpg'];

  return (
    <section className="relative h-[50vh] md:h-[60vh] flex items-center justify-center text-white overflow-hidden py-20">
    
      {/* Parallax Background Layer */}
        <div 
            className="absolute inset-0 w-full h-full"
            style={{
            transform: `translateY(${scrollY * 0.5}px)`,
            transition: 'transform 0s linear',
            }}
        >
            {/* Background Carousel Images */}
            {displayImages.map((url, index) => (
            <div 
                key={url + index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100 z-0' : 'opacity-0 -z-10'
                }`}
            >
                    <Image
                    src={url}
                    alt={`GKIAS Gallery ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    />
                </div>
                ))}
            </div>

      {/* Dark Overlay for text visibility */}
      <div className="absolute inset-0 bg-black opacity-60 z-10"></div>
      
        {/* Content Container (z-index 20) */}
        <div className="relative z-20 max-w-4xl mx-auto p-6 text-center">
          {title && (
            <h2 className="text-3xl md:text-5xl font-bold mb-4 shadow-text">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-lg md:text-xl font-medium shadow-text">
              {description}
            </p>
          )}
        </div>
    </section>
  );
}