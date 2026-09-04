'use client';

import Image from 'next/image';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
  imageUrl?: string;
  description?: string;
}

export default function ScheduleCard({ schedule, onClick }: { schedule: Schedule; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full aspect-[4/5] rounded-2xl overflow-hidden text-left"
    >
      <Image
        src={schedule.imageUrl || '/placeholder-hero.jpg'}
        alt={schedule.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <p className="text-cream-50 font-semibold text-sm sm:text-lg leading-tight line-clamp-2">
          {schedule.name}
        </p>
        <p className="text-cream-100/80 text-xs sm:text-sm mt-0.5">{schedule.time}</p>
      </div>
    </button>
  );
}