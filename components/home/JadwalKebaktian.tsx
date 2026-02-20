// components/home/JadwalKebaktian.tsx
'use client'; // <-- Required for state and intervals

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

interface HeroProps {
  heroImageUrls: string[];
  schedules: Schedule[];
}

export default function JadwalKebaktian({heroImageUrls, schedules }: HeroProps) {
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
    <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            {/* <h2 className="text-4xl font-extrabold text-blue-900 mb-8">Jadwal Kebaktian</h2> */}
            <h2 className="text-3xl font-bold text-blue-900">Jadwal Kebaktian</h2>
            <Link href="/kebaktian" className="text-blue-600 font-semibold hover:text-blue-800 transition duration-300">
              View All &rarr;
            </Link>
          </div>
          <ul className="space-y-6">
            {schedules.slice(0, 3).map((s) => (
              <li key={s.id} className="flex justify-between items-center"> 
                <span className="font-semibold text-lg text-gray-800">{s.name}</span>
                <span className="font-medium text-blue-600 text-lg">{s.time}</span>
              </li>
            ))}
          </ul>
          {/* <div className="mt-8">
            <Link href="/kebaktian" className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300">
              View More &rarr;
            </Link>
          </div> */}
        </div>
      </section>
  );
}