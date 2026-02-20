'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface NewsPageHeaderProps {
  heroImageUrls: string[];
  title?: string;
  subtitle?: string;
}

export default function NewsPageHeader({ heroImageUrls, title = "Warta Jemaat & Informasi", subtitle = "Ikuti perkembangan terkini gereja kami melalui bulletin dan berita terbaru." }: NewsPageHeaderProps) {
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
  const displayImages = Array.isArray(heroImageUrls) 
    ? heroImageUrls 
    : (typeof heroImageUrls === 'string' && heroImageUrls !== '' 
        ? [heroImageUrls] 
        : ['/placeholder-hero.jpg']);

  return (
    <section className="relative h-[60vh] md:h-[50vh] flex items-end justify-center text-white overflow-hidden pb-16">

  {/* Content */}
  <div className="relative z-30 max-w-6xl mx-auto p-4 text-center">
    <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-gray-100">
          {subtitle}
        </p>
      </div>
      
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
            alt={`GKIAS Background ${index + 1}`}
            fill
            style={{ objectFit: 'cover' }}
            priority={index === 0}
          />
        </div>
      ))}

{/* overlay layer */}
      <div className="absolute inset-0 bg-black opacity-50 z-10"></div>
    </section>
  );
}
