// app/about-us/page.tsx
import { getHomePageSettings } from '@/lib/data';
import Image from 'next/image';

export default async function AboutUsPage() {
  const settings = await getHomePageSettings();

  if (!settings) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-red-600">Error: Gagal memuat data pengaturan halaman.</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-blue-900 mb-4">Tentang Kami</h1>
          <p className="text-xl text-gray-600">Gereja Kristen Indonesia Alam Sutera</p>
        </header>

        {/* Visi Section */}
        <section className="bg-white p-8 rounded-xl shadow-2xl mb-12 border-t-8 border-blue-600">
          <h2 className="text-4xl font-extrabold text-blue-800 mb-6 flex items-center">
            <span className="text-6xl mr-4">💡</span> Visi Kami
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed">
            {settings.visi}
          </p>
        </section>

        {/* Misi Section */}
        <section className="bg-white p-8 rounded-xl shadow-2xl mb-12 border-t-8 border-green-600">
          <h2 className="text-4xl font-extrabold text-green-800 mb-6 flex items-center">
            <span className="text-6xl mr-4">🎯</span> Misi Kami
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed">
            {settings.misi}
          </p>
        </section>
        
        {/* Gereja Induk Section */}
        <section className="bg-gray-100 p-8 rounded-xl shadow-lg flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/3 relative h-64 w-full rounded-lg overflow-hidden">
            <Image
              src={settings.gerejaIndukImageUrl}
              alt={settings.gerejaIndukTitle}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <div className="md:w-2/3">
            <h2 className="text-3xl font-bold text-blue-900 mb-4">{settings.gerejaIndukTitle}</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{settings.gerejaIndukDescription}</p>
          </div>
        </section>

      </div>
    </main>
  );
}