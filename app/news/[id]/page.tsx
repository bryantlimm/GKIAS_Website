// app/news/[id]/page.tsx
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

interface NewsDetail {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  body: string;
  pdfUrl?: string; // Add this
}

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getNewsItem(id: string): Promise<NewsDetail | null> {
  try {
    const docRef = doc(db, "news", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const formattedDate = data.date instanceof Timestamp
          ? data.date.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
          : data.date;

      return {
        id: docSnap.id,
        title: data.title as string,
        imageUrl: data.imageUrl as string,
        date: formattedDate,
        body: data.body || "",
        pdfUrl: data.pdfUrl || "" // Fetch PDF URL
      };
    } else {
        return null;
    }
  } catch (error) {
    return null;
  }
}

export default async function NewsDetailPage(props: NewsDetailPageProps) {
  const params = await props.params;
  const newsId = params.id; 
  
  if (!newsId) return <div>Error</div>;

  const newsItem = await getNewsItem(newsId);
  if (!newsItem) return <div className="pt-24 text-center">Berita tidak ditemukan</div>;

  return (
    <main className="min-h-screen pt-20 bg-white">
      {/* Hero Section */}
      <div className="relative h-64 md:h-96 w-full">
        <Image src={newsItem.imageUrl} alt={newsItem.title} fill className="object-cover z-0" />
        <div className="absolute inset-0 bg-black opacity-40 z-10"></div>
        <div className="relative z-20 max-w-4xl mx-auto h-full flex items-end p-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">{newsItem.title}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-lg font-semibold text-blue-600 mb-6 border-b pb-2">
          Tanggal Publikasi: {newsItem.date}
        </p>

        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap mb-8">
          <p>{newsItem.body}</p>
        </div>

        {/* --- PDF DOWNLOAD BUTTON (New Feature) --- */}
        {newsItem.pdfUrl && (
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl flex items-center justify-between mb-10">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Lampiran Dokumen</h3>
                    <p className="text-gray-600 text-sm">Unduh warta jemaat lengkap dalam format PDF.</p>
                </div>
                <a 
                    href={newsItem.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center py-2 px-6 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md"
                >
                    <span className="mr-2">📄</span> Download PDF
                </a>
            </div>
        )}
        
        <div className="mt-10">
          <Link href="/news" className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800 transition duration-300">
            &larr; Kembali ke Daftar Berita
          </Link>
        </div>
      </div>
    </main>
  );
}