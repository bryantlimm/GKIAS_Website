// app/page.tsx
import HeroSection from '@/components/home/HeroSection';
import NewsSection from '@/components/home/NewsSection';
import VisiMisi from '@/components/home/VisiMisi';
import GerejaInduk from '@/components/home/GerejaInduk';
import { getHomePageSettings, getServiceSchedules, getLatestNews } from '@/lib/data';

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

      {/* Jadwal Kebaktian Section */}
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
      
      {/* 2. News Section (Carousel) */}
      <NewsSection latestNews={latestNews} />
      
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