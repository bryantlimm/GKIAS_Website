'use client';

import { useState } from 'react';
import ScheduleCard from './ScheduleCard';
import ScheduleModal from './ScheduleModal';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
  imageUrl?: string;
  description?: string;
}

export default function ScheduleGrid({
  schedules,
  columns = 3,
}: {
  schedules: Schedule[];
  columns?: 2 | 3;
}) {
  const [selected, setSelected] = useState<Schedule | null>(null);
  const gridClass = columns === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3';

  return (
    <>
      <div className={`grid ${gridClass} gap-3 sm:gap-5`}>
        {schedules.map((s) => (
          <ScheduleCard key={s.id} schedule={s} onClick={() => setSelected(s)} />
        ))}
      </div>
      <ScheduleModal schedule={selected} onClose={() => setSelected(null)} />
    </>
  );
}