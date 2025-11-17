// components/home/HeroSection.tsx
import Link from 'next/link';
import Image from 'next/image';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

interface HeroProps {
  heroTitle: string;
  heroImageUrl: string;
  schedules: Schedule[];
}

export default function HeroSection({ heroTitle, heroImageUrl, schedules }: HeroProps) {
  return (
    <section className="relative h-[60vh] md:h-[80vh] flex items-center justify-center text-white">
      {/* Background Image */}
      <Image
        src={heroImageUrl}
        alt="GKIAS Background"
        layout="fill"
        objectFit="cover"
        className="z-0"
      />
      {/* Dark Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black opacity-50 z-10"></div>
      
      {/* Content Container (z-index 20) */}
      <div className="relative z-20 max-w-6xl mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Title (Left Side) */}
        <div className="md:w-1/2 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight shadow-text">
            {heroTitle}
          </h1>
        </div>

        {/* Services Schedule (Right Side) */}
        <div className="md:w-1/2 bg-white/90 p-6 md:p-8 rounded-xl shadow-2xl text-blue-900">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-200 pb-2">Jadwal Kebaktian</h2>
          <ul className="space-y-3">
            {schedules.map((s) => (
              <li key={s.id} className="flex justify-between text-lg md:text-xl">
                <span className="font-semibold">{s.name}</span>
                <span className="font-medium text-blue-700">{s.time}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-center">
            <Link href="/kebaktian" className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300">
              View More &rarr;
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}