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
    <section className="w-full bg-blue-50 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt="Retreat Keluarga 2026"
            width={400}
            height={200}
            className="rounded-xl shadow w-full md:w-64 object-cover"
          />
        )}
        <div className="flex-1 text-center md:text-left space-y-3">
          <h2 className="text-2xl font-bold text-gray-800">Retreat Keluarga 2026</h2>
          <p className="text-gray-600 text-sm">
            Daftarkan keluarga Anda untuk retreat spesial tahun ini. Tempat terbatas!
          </p>
          <Link
            href="/retreatkeluarga2026"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Daftar Sekarang →
          </Link>
        </div>
      </div>
    </section>
  );
}