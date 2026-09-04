// app/kebaktian/page.tsx
import { getServiceSchedules, getHomePageSettings } from '@/lib/data';
import NewsPageHeader from '@/app/news/NewsPageHeader';
import ScheduleGrid from '@/components/schedules/ScheduleGrid';

export const dynamic = 'force-dynamic';

export default async function KebaktianPage() {
  const [schedules, settings] = await Promise.all([
    getServiceSchedules(),
    getHomePageSettings(),
  ]);

  return (
    <main className="bg-cream-100">
      <NewsPageHeader
        heroImageUrls={settings?.heroImageUrls || []}
        title="Jadwal Kebaktian"
        subtitle="Mari beribadah bersama kami. Tuhan memberkati."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ScheduleGrid schedules={schedules} columns={2} />

        <div className="mt-12 p-6 bg-cream-200 border-l-4 border-ink-900/20 rounded-xl text-center">
          <p className="text-lg font-medium text-ink-700">
            Pastikan untuk memeriksa pengumuman terbaru mengenai perubahan jadwal ibadah.
          </p>
        </div>
      </div>
    </main>
  );
}