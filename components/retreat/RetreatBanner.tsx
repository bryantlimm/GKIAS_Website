"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getRetreatConfig } from "@/lib/firebase";

export default function RetreatBanner() {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    getRetreatConfig().then((c) => setBannerUrl(c?.bannerUrl || null));
  }, []);

  return (
    <section className="bg-blue-50 flex flex-col md:flex-row overflow-hidden md:min-h-100">
      {/* Left: text content */}
      <div className="flex-1 flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg space-y-6 text-center md:text-left mx-auto md:mx-0 md:ml-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900 leading-tight">
            Retreat Keluarga 2026
          </h2>
          <p className="text-lg text-gray-700">
            Daftarkan keluarga Anda untuk retreat spesial tahun ini. Tempat terbatas!
          </p>
          <div>
            <Link
              href="/retreatkeluarga2026"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Daftar Sekarang →
            </Link>
          </div>
        </div>
      </div>

      {/* Right: full-bleed image, no padding/margin */}
      {bannerUrl && (
        <div className="w-full md:w-1/2 relative min-h-64 md:min-h-0">
          <Image
            src={bannerUrl}
            alt="Retreat Keluarga 2026"
            fill
            className="object-cover"
          />
        </div>
      )}
    </section>
  );
}