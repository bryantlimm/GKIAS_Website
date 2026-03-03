// components/lfjkids/BusScene.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export default function BusScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Desktop: track bus X position as % of container width
  const [busX, setBusX] = useState(50); // 0–100%
  const [facingRight, setFacingRight] = useState(true);
  const lastX = useRef(50);

  // ── DESKTOP: mouse move ──────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      // Map mouse X within the section to 0–100%
      const relX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const pct = (relX / rect.width) * 100;

      if (pct > lastX.current + 0.3) setFacingRight(true);
      else if (pct < lastX.current - 0.3) setFacingRight(false);

      lastX.current = pct;
      setBusX(pct);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ── MOBILE: horizontal scroll ────────────────────────────────────────────
  const lastScrollLeft = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const current = el.scrollLeft;
      if (current > lastScrollLeft.current + 2) setFacingRight(true);
      else if (current < lastScrollLeft.current - 2) setFacingRight(false);
      lastScrollLeft.current = current;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Bus width as % of skyline container (tweak to taste)
  const BUS_WIDTH_VW = 28; // vw on desktop
  // Clamp so bus doesn't overflow: map busX (0–100) to actual left offset
  // We offset by half the bus width so the center tracks the cursor
  const busLeft = `calc(${busX}% - ${BUS_WIDTH_VW / 2}vw)`;

  return (
    <>
      {/* ── DESKTOP SECTION (hidden on mobile) ── */}
      <section
        ref={sectionRef}
        className="relative w-full hidden md:block select-none"
        style={{ height: 'clamp(160px, 20vw, 200px)', marginTop: '200px' }}
      >
        {/* Skyline stretches full width */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/skyline2.png"
            alt="City Skyline"
            fill
            className="object-cover object-bottom"
            priority
          />
        </div>

        {/* Bus — pinned to bottom, follows cursor X */}
        <div
          className="absolute bottom-0 transition-[left] duration-100 ease-out pointer-events-none"
          style={{
            left: busLeft,
            width: `${BUS_WIDTH_VW}vw`,
            transform: facingRight ? 'scaleX(1)' : 'scaleX(-1)',
          }}
        >
          <Image
            src="/bus.png"
            alt="Bus"
            width={300}
            height={150}
            className="w-full h-auto object-contain object-bottom"
          />
        </div>
      </section>

      {/* ── MOBILE SECTION (hidden on desktop) ── */}
      <section className="relative w-full md:hidden select-none overflow-hidden">
        {/* Horizontally scrollable inner track */}
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden"
          style={{
            height: 'clamp(140px, 40vw, 220px)',
            /* hide scrollbar */
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            marginTop: '200px',
          }}
        >
          {/* Wide skyline — scrollable canvas */}
          <div
            className="relative h-full"
            style={{ width: '250vw', minWidth: '600px' }}
          >
            <Image
              src="/skyline2.png"
              alt="City Skyline"
              fill
              className="object-cover object-bottom"
            />
          </div>
        </div>

        {/* Bus — fixed horizontally centered, sits at bottom of the section */}
        <div
          className="absolute bottom-0 left-1/2 pointer-events-none"
          style={{
            transform: facingRight
              ? 'translateX(-50%) scaleX(1)'
              : 'translateX(-50%) scaleX(-1)',
            width: '50vw',
            maxWidth: '250px',
            transition: 'transform 0.15s ease',
          }}
        >
          <Image
            src="/bus.png"
            alt="Bus"
            width={300}
            height={150}
            className="w-full h-auto object-contain object-bottom"
          />
        </div>
      </section>
    </>
  );
}
