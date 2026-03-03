// app/lfjkids/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import LfjCarousel from '@/components/lfjkids/LfjCarousel';

export const dynamic = 'force-dynamic';

export default async function LfjKidsPage() {
  let carouselData = {
    imageUrls: [],
    cloudText: 'Join us every\nSunday 10am' // Default fallback
  };

  try {
    const docRef = doc(db, 'settings', 'lfjkids');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      carouselData = {
        imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
        cloudText: data.cloudText || carouselData.cloudText,
      };
    }
  } catch (error) {
    console.error("Error fetching LFJ Kids data:", error);
  }

  return (
    <main className="min-h-screen bg-[#FFFDF6] relative overflow-hidden pb-32 pt-12 md:pt-12">
      
      {/* HEADER: Back Button & Logos */}
      <div className="relative pt-8 px-6 md:px-12 flex items-start justify-center z-20">
        
        {/* Back Button (Hidden on very small screens, or positioned absolute) */}
        <div className="absolute left-6 md:left-12 top-10">
          <Link href="/" className="text-blue-500 hover:text-blue-700 font-medium flex items-center gap-2">
            <span>&larr;</span> back
          </Link>
        </div>

        {/* Center Logos */}
        <div className="flex items-center justify-center gap-4 mt-12 md:mt-0">
          <Image src="/lfjgki.png" alt="GKI Alam Sutera" width={180} height={60} className="object-contain h-12 w-auto" />
          {/* <Image src="/lfj_logo.png" alt="Little Friends of Jesus" width={120} height={60} className="object-contain h-14 w-auto" /> */}
        </div>
      </div>

      {/* HERO SECTION: The quote text image */}
      <div className="relative w-full max-w-4xl mx-auto mt-12 px-4 z-20">
        <Image 
          src="/ltlcctm.png" 
          alt="Let the little children come to Me" 
          width={800} 
          height={400} 
          className="w-full h-auto object-contain"
          priority
        />
      </div>

      {/* RAINBOW BACKGROUND LAYER */}
      <div className="absolute top-[20%] left-0 w-full h-full z-0 overflow-hidden opacity-100 pointer-events-none">
        <Image 
          src="/rainbow.png" 
          alt="Rainbow Background" 
          fill
          className="object-cover md:object-contain object-left scale-110 translate-y-60 md:translate-y-8" 
        />
      </div>

      {/* CAROUSEL SECTION */}
      <div className="relative z-10 px-4 md:px-12 mt-8">
        <LfjCarousel 
          imageUrls={carouselData.imageUrls} 
          cloudText={carouselData.cloudText} 
        />
      </div>

    </main>
  );
}