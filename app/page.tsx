// app/page.tsx
import HeroSection from '@/components/home/HeroSection';
import NewsSection from '@/components/home/NewsSection';
import VisiMisi from '@/components/home/VisiMisi';
import GerejaInduk from '@/components/home/GerejaInduk';
import { getHomePageSettings, getServiceSchedules, getLatestNews } from '@/lib/data';

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
    <main className="pt-16">
      {/* 1. Hero and Schedules Section */}
      <HeroSection 
        heroTitle={settings.heroTitle}
        heroImageUrl={settings.heroImageUrl}
        // FIX: Only take the first 3 items from the array
        schedules={schedules.slice(0, 3)} 
      />
      
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