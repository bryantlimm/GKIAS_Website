// app/news/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import NewsPageHeader from '@/components/NewsPageHeader';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { getHomePageSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Define the structure of a News Item
interface NewsItem {
  id: string;
  title: string;
  date: string; // Formatted date string
  heroImageUrls: string[];
  imageUrl: string;
  // heroImageUrls: string[];
}

// Function to fetch ALL news items, ordered by date
async function getAllNews(): Promise<NewsItem[]> {
  try {
    const newsCollection = collection(db, "news");
    // Query for all documents, ordered by date descending
    const q = query(newsCollection, orderBy("date", "desc"));

    const querySnapshot = await getDocs(q);
    
    const news = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to a simple, serializable date string
      const formattedDate = 
        data.date instanceof Timestamp
          ? data.date.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
          : data.date;

      return {
        id: doc.id as string,
        title: data.title as string,
        imageUrl: data.imageUrl as string,
        date: formattedDate,
      };
    });
    return news;
  } catch (error) {
    console.error("Error fetching all news:", error);
    return [];
  }
}


export default async function NewsListingPage() {
  const [allNews, settings] = await Promise.all([
    getAllNews(),
    getHomePageSettings()
  ]);

  const heroImageUrls = settings?.heroImageUrls || [];

  return (
    <main className="bg-gray-50">
      {/* Page Header with Carousel */}
      <NewsPageHeader heroImageUrls={heroImageUrls} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {allNews.length > 0 ? (
            allNews.map((newsItem) => (
              <Link 
                key={newsItem.id} 
                href={`/news/${newsItem.id}`}
                className="block bg-white rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* News Image */}
                <div className="relative w-full h-48">
                  <Image
                    src={newsItem.imageUrl || "https://via.placeholder.com/600x400?text=No+Image"}
                    alt={newsItem.title}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                
                {/* News Content */}
                <div className="p-6">
                  <p className="text-sm font-semibold text-blue-600 mb-2">{newsItem.date}</p>
                  <h2 className="text-xl font-bold text-gray-800 line-clamp-2">{newsItem.title}</h2>
                  {/* Placeholder for summary */}
                  <p className="text-gray-600 mt-2 text-sm line-clamp-3">View details.</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="col-span-3 text-center text-xl text-gray-500 py-10">
              Belum ada berita atau warta jemaat yang tersedia saat ini.
            </p>
          )}

        </div>
        
      </div>
    </main>
  );
}