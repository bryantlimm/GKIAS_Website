// app/page.tsx
import HeroSection from '@/components/home/HeroSection';
import NewsSection from '@/components/home/NewsSection';
import VisiMisi from '@/components/home/VisiMisi';
import GerejaInduk from '@/components/home/GerejaInduk';
import JadwalKebaktian from '@/components/home/JadwalKebaktian';
import PhotoSection from '@/components/home/PhotoSection'; // <-- Import the new component

import { getHomePageSettings, getServiceSchedules, getLatestNews } from '@/lib/data';
// 👇 You need to import db and getDoc to fetch the photo settings directly here
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore'; 

export const dynamic = 'force-dynamic';

export default async function Home() {
  
  // 1. Fetch the normal data
  const [settings, schedules, latestNews] = await Promise.all([
    getHomePageSettings(),
    getServiceSchedules(),
    getLatestNews(),
  ]);

  // 2. Fetch the new Photo Section data
  let photoData = { title: '', description: '', imageUrls: [] };
  try {
    const photoDoc = await getDoc(doc(db, 'settings', 'photoSection'));
    if (photoDoc.exists()) {
      photoData = photoDoc.data() as any;
    }
  } catch (e) {
    console.error("Failed to fetch photo section data", e);
  }

  if (!settings) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-20">
        <p className="text-xl text-red-500">Error: Home page settings data is missing.</p>
      </div>
    );
  }

  return (
    <main>
      <HeroSection 
        heroTitle={settings.heroTitle} 
        heroImageUrls={settings.heroImageUrls}
        schedules={schedules.slice(0, 3)} 
      />
      
      <NewsSection latestNews={latestNews} />
      
      <JadwalKebaktian 
        heroImageUrls={settings.heroImageUrls}
        schedules={schedules.slice(0, 3)} 
      />

      {/* 👇 NEW PHOTO SECTION GOES HERE 👇 */}
      <PhotoSection 
        title={photoData.title}
        description={photoData.description}
        imageUrls={photoData.imageUrls}
      />

      <VisiMisi visi={settings.visi} misi={settings.misi} />

      <GerejaInduk 
        gerejaIndukTitle={settings.gerejaIndukTitle}
        gerejaIndukDescription={settings.gerejaIndukDescription}
        gerejaIndukImageUrl={settings.gerejaIndukImageUrl} 
      />
    </main>
  );
}