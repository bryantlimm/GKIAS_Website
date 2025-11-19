// app/kebaktian/page.tsx
import { getServiceSchedules } from '@/lib/data';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

// Interface for type safety
interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

// Next.js Server Component to fetch data
export default async function KebaktianPage() {
  const schedules: Schedule[] = await getServiceSchedules();
  
  return (
    <main className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <h1 className="text-4xl font-extrabold text-blue-900 mb-4 border-b-4 border-blue-600 pb-2 text-center">
          Jadwal Kebaktian
        </h1>
        <p className="text-xl text-gray-600 mb-10 text-center">
          Mari beribadah bersama kami. Tuhan memberkati.
        </p>

        {/* Schedule List Container */}
        <div className="space-y-8">
          {schedules.map((schedule) => (
            <div 
              key={schedule.id} 
              className="bg-white p-6 md:p-8 rounded-xl shadow-lg flex justify-between items-center transition duration-300 hover:shadow-xl hover:scale-[1.01]"
            >
              <div className="flex items-center space-x-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{schedule.name}</h2>
                  {/* Additional info for the kids service */}
                  {schedule.order === 3 && (
                     <p className="text-sm text-gray-500">Ibadah Sekolah Minggu / LFJ Kids</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-extrabold text-blue-700">
                  {schedule.time}
                </p>
                <p className="text-sm text-gray-500">Waktu Indonesia Barat (WIB)</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-6 bg-blue-100 border-l-4 border-blue-600 rounded-lg text-center">
          <p className="text-lg font-medium text-blue-800">
            Pastikan untuk memeriksa pengumuman terbaru mengenai perubahan jadwal ibadah.
          </p>
        </div>
        
      </div>
    </main>
  );
}