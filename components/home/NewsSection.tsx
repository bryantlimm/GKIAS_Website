// components/home/NewsSection.tsx
import Link from 'next/link';
import Image from 'next/image';

interface NewsItem {
  id: string;
  title: string;
  date: string; // The formatted date string from lib/data.ts
  imageUrl: string;
}

interface NewsProps {
  latestNews: NewsItem[];
}

// News Card component
const NewsCard: React.FC<NewsItem> = ({ title, date, imageUrl, id }) => (
  <Link href={`/news/${id}`} className="block bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
    {/* Placeholder or real image */}
    <div className="relative w-full h-40">
      <Image
        src={imageUrl}
        alt={title}
        layout="fill"
        objectFit="cover"
        className="transform hover:scale-105 transition duration-500"
      />
    </div>
    <div className="p-4">
      <p className="text-sm text-gray-500 mb-1">{date}</p>
      <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{title}</h3>
    </div>
  </Link>
);

export default function NewsSection({ latestNews }: NewsProps) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold text-blue-900">📰 News</h2>
          <Link href="/news" className="text-blue-600 font-semibold hover:text-blue-800 transition duration-300">
            View All &rarr;
          </Link>
        </div>

        {/* Carousel/Grid area - displays fetched news */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestNews.length > 0 ? (
            latestNews.map((newsItem) => (
              <NewsCard key={newsItem.id} {...newsItem} />
            ))
          ) : (
            <p className="col-span-3 text-center text-gray-500">No news bulletins available yet.</p>
          )}
        </div>

      </div>
    </section>
  );
}