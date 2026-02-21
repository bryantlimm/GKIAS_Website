// app/page.tsx
import HeroSection from '@/components/home/HeroSection';
import NewsSection from '@/components/home/NewsSection';
import VisiMisi from '@/components/home/VisiMisi';
import GerejaInduk from '@/components/home/GerejaInduk';
import JadwalKebaktian from '@/components/home/JadwalKebaktian';
import PhotoSection from '@/components/home/PhotoSection'; // <-- Import the new component
import VideoSection from '@/components/home/VideoSection';
import { getHomePageSettings, getServiceSchedules, getLatestNews } from '@/lib/data';
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
  // Fetch Video Section
  let videoData = { title: '', description: '', youtubeUrl: '' };

  try {
    const [photoDoc, videoDoc] = await Promise.all([
      getDoc(doc(db, 'settings', 'photoSection')),
      getDoc(doc(db, 'settings', 'youtubeSection'))
    ]);
    
    if (photoDoc.exists()) {
      const photoRawData = photoDoc.data() as any;
      photoData = {
        title: photoRawData.title || '',
        description: photoRawData.description || '',
        imageUrls: Array.isArray(photoRawData.imageUrls) ? photoRawData.imageUrls : []
      };
    }
    if (videoDoc.exists()) videoData = videoDoc.data() as any;
  } catch (e) {
    console.error("Failed to fetch extra section data", e);
  }

  if (!settings) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-20">
        <p className="text-xl text-red-500">Error: Home page settings data is missing.</p>
      </div>
    );
  }

  // Debug logging
  console.log("Home page - photoData:", photoData);
  console.log("Home page - photoData.imageUrls:", photoData.imageUrls);

  return (
    <main>
      <HeroSection 
        heroTitle={settings.heroTitle} 
        heroImageUrls={settings.heroImageUrls}
        schedules={schedules.slice(0, 3)} 
      />

      <VideoSection 
        title={videoData.title}
        description={videoData.description}
        youtubeUrl={videoData.youtubeUrl}
      />

      <NewsSection latestNews={latestNews} />
      
      <JadwalKebaktian 
        heroImageUrls={settings.heroImageUrls}
        schedules={schedules.slice(0, 3)} 
      />

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