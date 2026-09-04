// components/home/JadwalKebaktian.tsx
import Link from 'next/link';
import ScheduleGrid from '@/components/schedules/ScheduleGrid';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
  imageUrl?: string;
  description?: string;
}

export default function JadwalKebaktian({ schedules }: { schedules: Schedule[] }) {
  return (
    <section className="py-16 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold text-ink-900">Jadwal Kebaktian</h2>
          <Link href="/kebaktian" className="text-ink-600 font-semibold hover:text-ink-900 transition duration-300">
            View All &rarr;
          </Link>
        </div>
        <ScheduleGrid schedules={schedules.slice(0, 3)} columns={3} />
      </div>
    </section>
  );
}