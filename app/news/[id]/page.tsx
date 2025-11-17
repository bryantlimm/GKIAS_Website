// app/news/[id]/page.tsx
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import Image from 'next/image';

// Define the expected data structure
interface NewsDetail {
  id: string;
  title: string;
  date: string; // Formatted date string
  imageUrl: string;
  body: string; // Placeholder for the main content/text of the bulletin
}

// Define the props structure for the component, receiving URL parameters
interface NewsDetailPageProps {
  params: {
    id: string; // This matches the folder name [id]
  };
}

// Function to fetch a single news document by ID
async function getNewsItem(id: string): Promise<NewsDetail | null> {
  try {
    console.log("Attempting to fetch document with ID:", id);

    const docRef = doc(db, "news", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        console.log("Document found:", docSnap.id);
        const data = docSnap.data();
      
      // Convert Timestamp to simple string
      const formattedDate = 
        data.date instanceof Timestamp
          ? data.date.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
          : data.date;

      return {
        id: docSnap.id,
        title: data.title as string,
        imageUrl: data.imageUrl as string,
        date: formattedDate,
        // Using a placeholder for the 'body' until you add it to the database
        body: data.body || "Ini adalah detail lengkap dari warta jemaat/berita yang bersangkutan. Konten ini bisa berupa pengumuman, renungan, atau ringkasan acara. Anda dapat menambahkan field 'body' (string atau HTML) ke Firestore untuk menampilkan konten yang sesungguhnya."
      };
    } else {
        console.error(`Document with ID ${id} not found in Firestore.`);
        return null;
    }
  } catch (error) {
    console.error("Error fetching single news item:", error);
    return null;
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  // FIX: Access the ID directly and check its existence
  const newsId = params.id; 
  
  if (!newsId) {
    // This catches the 'undefined' error gracefully
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-red-600">ID Berita tidak ditemukan dalam URL.</h1>
      </div>
    );
  }

  // Pass the safely checked ID to the fetching function
  const newsItem = await getNewsItem(newsId);

  if (!newsItem) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-red-600">404 - Berita Tidak Ditemukan</h1>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-20 bg-white">
      {/* Hero Section */}
      <div className="relative h-64 md:h-96 w-full">
        <Image
          src={newsItem.imageUrl}
          alt={newsItem.title}
          layout="fill"
          objectFit="cover"
          className="z-0"
        />
        <div className="absolute inset-0 bg-black opacity-40 z-10"></div>
        <div className="relative z-20 max-w-4xl mx-auto h-full flex items-end p-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            {newsItem.title}
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <p className="text-lg font-semibold text-blue-600 mb-6 border-b pb-2">
          Tanggal Publikasi: {newsItem.date}
        </p>

        {/* The main content/body of the bulletin */}
        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
          <p>{newsItem.body}</p>
        </div>
        
        {/* Simple back button */}
        <div className="mt-10">
          <a href="/news" className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800 transition duration-300">
            &larr; Kembali ke Daftar Berita
          </a>
        </div>
      </div>
    </main>
  );
}