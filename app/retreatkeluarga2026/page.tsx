"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getRetreatConfig } from "@/lib/firebase";
import type { RetreatConfig } from "@/lib/retreat-types";

export default function RetreatLandingPage() {
  const [config, setConfig] = useState<RetreatConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetreatConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Memuat...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Full-width poster — starts below the 80px navbar */}
      {config?.posterUrl && (
        // <div className="w-full pt-20">
          <Image
            src={config.posterUrl}
            alt="Retreat Keluarga 2026 Poster"
            width={1920}
            height={1080}
            className="w-full h-auto block"
            priority
          />
        // </div>
      )}

      {/* If no poster, add top padding so content doesn't hide under navbar */}
      {!config?.posterUrl && <div className="pt-20" />}

      {/* Content card */}
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {config && (
          <>
            {/* Title + theme */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
              <p className="text-base text-blue-600 font-medium">Tema: {config.theme}</p>
            </div>

            {/* Info grid */}
            <div className="bg-white rounded-2xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
              {config.date && (
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <div><p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-0.5">Tanggal</p><p>{config.date}</p></div>
                </div>
              )}
              {config.location && (
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                  <div><p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-0.5">Tempat</p><p>{config.location}</p></div>
                </div>
              )}
              {config.speakerNames?.length > 0 && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <span className="text-blue-500 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </span>
                  <div><p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-0.5">Pembicara</p><p>{config.speakerNames.join(", ")}</p></div>
                </div>
              )}
            </div>

            {/* Description */}
            {config.description && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{config.description}</p>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <p className="font-semibold text-gray-800">Biaya Pendaftaran</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Jemaat / Simpatisan</p>
                  {[["Kamar isi 4", "Rp 470.000"], ["Kamar isi 3", "Rp 570.000"], ["Kamar isi 2", "Rp 670.000"]].map(([label, price]) => (
                    <div key={label} className="flex justify-between text-sm text-gray-600 border-b border-gray-100 pb-1">
                      <span>{label}</span><span className="font-medium text-gray-800">{price},-</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Non Jemaat</p>
                  {[["Kamar isi 4", "Rp 600.000"], ["Kamar isi 3", "Rp 700.000"], ["Kamar isi 2", "Rp 800.000"]].map(([label, price]) => (
                    <div key={label} className="flex justify-between text-sm text-gray-600 border-b border-gray-100 pb-1">
                      <span>{label}</span><span className="font-medium text-gray-800">{price},-</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bank info */}
            {config.bankAccount && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-1 text-sm">
                <p className="font-semibold text-blue-800 flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  Pembayaran via Transfer
                </p>
                <p className="text-blue-700">{config.bankName} — {config.bankAccount}</p>
                <p className="text-blue-700">a.n. {config.bankHolder}</p>
              </div>
            )}
          </>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {config?.isOpen ? (
            <Link
              href="/retreatkeluarga2026/registration"
              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl font-bold text-base hover:bg-blue-700 active:scale-95 transition"
            >
              Daftar Sekarang →
            </Link>
          ) : (
            <div className="flex-1 bg-gray-200 text-gray-400 text-center py-4 rounded-2xl font-bold text-base cursor-not-allowed select-none">
              Pendaftaran Ditutup
            </div>
          )}
          <Link
            href="/retreatkeluarga2026/myregistration"
            className="flex-1 border-2 border-blue-600 text-blue-600 text-center py-4 rounded-2xl font-bold text-base hover:bg-blue-50 active:scale-95 transition"
          >
            Pendaftaran Saya
          </Link>
        </div>
      </div>
    </div>
  );
}