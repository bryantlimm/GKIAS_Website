'use client';

import Image from 'next/image';
import { useEffect } from 'react';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
  imageUrl?: string;
  description?: string;
}

export default function ScheduleModal({ schedule, onClose }: { schedule: Schedule | null; onClose: () => void }) {
  useEffect(() => {
    if (!schedule) return;
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [schedule, onClose]);

  if (!schedule) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-cream-50 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-cream-50/90 text-ink-700 hover:bg-cream-50 transition"
        >
          ✕
        </button>

        <div className="relative w-full h-56 sm:h-64 bg-cream-200">
          <Image
            src={schedule.imageUrl || '/placeholder-hero.jpg'}
            alt={schedule.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="p-6 sm:p-8">
          <h3 className="text-2xl font-bold text-ink-900">{schedule.name}</h3>
          <p className="text-ink-600 mt-1 font-medium">{schedule.time} · WIB</p>

          {schedule.description ? (
            <p className="mt-4 text-ink-700 leading-relaxed whitespace-pre-wrap">
              {schedule.description}
            </p>
          ) : (
            <p className="mt-4 text-ink-400 italic">Deskripsi belum ditambahkan.</p>
          )}
        </div>
      </div>
    </div>
  );
}