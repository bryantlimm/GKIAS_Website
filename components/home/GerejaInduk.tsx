// components/home/GerejaInduk.tsx
import Image from 'next/image';
import Link from "next/link";

interface GerejaIndukProps {
  gerejaIndukTitle: string;
  gerejaIndukDescription: string;
  gerejaIndukImageUrl: string;
}

export default function GerejaInduk({ gerejaIndukTitle, gerejaIndukDescription, gerejaIndukImageUrl }: GerejaIndukProps) {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="https://gkibungur.or.id" target="_blank" rel="noopener noreferrer">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden md:flex md:items-center">
          
              {/* Image (Left Side) */}
              <div className="md:w-1/3 relative h-64 md:h-80">
                <Image
                  src={gerejaIndukImageUrl}
                  alt={gerejaIndukTitle}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              
              {/* Content (Right Side) */}
              <div className="md:w-2/3 p-8 md:p-12">
                <h2 className="text-4xl font-extrabold text-blue-900 mb-3">{gerejaIndukTitle}</h2>
                <p className="text-xl text-blue-600 font-medium mb-4">Gereja Induk Kami</p>
                <p className="text-gray-700 leading-relaxed">{gerejaIndukDescription}</p>
              </div>
            </div>
          </Link>
      </div>
    </section>
  );
}