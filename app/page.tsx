// app/page.tsx

// hosting pakai hostinger. email gereja. deployment firebase bryant.
import HeroSection from '@/components/home/HeroSection';
import NewsSection from '@/components/home/NewsSection';
import VisiMisi from '@/components/home/VisiMisi';
import GerejaInduk from '@/components/home/GerejaInduk';
import { getHomePageSettings, getServiceSchedules, getLatestNews } from '@/lib/data';
import JadwalKebaktian from '@/components/home/JadwalKebaktian';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch all necessary data concurrently
  const [settings, schedules, latestNews] = await Promise.all([
    getHomePageSettings(),
    getServiceSchedules(),
    getLatestNews(),
  ]);

  // Handle case where settings data is missing
  if (!settings) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-20">
        <p className="text-xl text-red-500">Error: Home page settings data is missing.</p>
      </div>
    );
  }

  return (
    <main>
      {/* 1. Hero and Schedules Section */}
      <HeroSection 
        heroTitle={settings.heroTitle} 
        heroImageUrls={settings.heroImageUrls}
        schedules={schedules.slice(0, 3)} 
      />
      
      {/* 2. News Section (Carousel) */}
      <NewsSection latestNews={latestNews} />
      
      {/* Jadwal Kebaktian Section */}
      <JadwalKebaktian 
        // schedules={schedules} 
        heroImageUrls={settings.heroImageUrls}
        schedules={schedules.slice(0, 3)} 
      />

      {/* 3. Visi & Misi */}
      <VisiMisi visi={settings.visi} misi={settings.misi} />

      {/* 4. Gereja Induk */}
      <GerejaInduk 
        gerejaIndukTitle={settings.gerejaIndukTitle}
        gerejaIndukDescription={settings.gerejaIndukDescription}
        gerejaIndukImageUrl={settings.gerejaIndukImageUrl} 
      />
    </main>
  );
}