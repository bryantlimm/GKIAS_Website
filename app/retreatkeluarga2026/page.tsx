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
    <div className="min-h-screen bg-white">
      {/* Full poster */}
      {config?.posterUrl && (
        <div className="w-full max-w-2xl mx-auto pt-8 px-4">
          <Image
            src={config.posterUrl}
            alt="Retreat Keluarga 2026 Poster"
            width={800}
            height={1100}
            className="w-full rounded-2xl shadow-lg"
            priority
          />
        </div>
      )}

      {/* Retreat details (from Firestore, fully editable by admin) */}
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        {config && (
          <>
            <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-lg text-blue-700 font-medium">Tema: {config.theme}</p>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div><span className="font-semibold">Tanggal:</span> {config.date}</div>
              <div><span className="font-semibold">Tempat:</span> {config.location}</div>
              <div><span className="font-semibold">Pembicara:</span> {config.speakerNames?.join(", ")}</div>
            </div>
            <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
              {config.description}
            </div>

            {/* Pricing table */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-800">Biaya Pendaftaran</p>
              <div className="text-sm space-y-1 text-gray-600">
                <p className="font-medium text-gray-700">Jemaat / Simpatisan:</p>
                <p>• Kamar isi 4 — Rp 470.000,-/orang</p>
                <p>• Kamar isi 3 — Rp 570.000,-/orang</p>
                <p>• Kamar isi 2 — Rp 670.000,-/orang</p>
                <p className="font-medium text-gray-700 mt-2">Non Jemaat / Simpatisan:</p>
                <p>• Kamar isi 4 — Rp 600.000,-/orang</p>
                <p>• Kamar isi 3 — Rp 700.000,-/orang</p>
                <p>• Kamar isi 2 — Rp 800.000,-/orang</p>
              </div>
            </div>

            {/* Bank info */}
            {config.bankAccount && (
              <div className="bg-blue-50 rounded-xl p-4 text-sm">
                <p className="font-semibold text-blue-800">Pembayaran via Transfer:</p>
                <p>{config.bankName} — {config.bankAccount}</p>
                <p>a.n. {config.bankHolder}</p>
              </div>
            )}
          </>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {config?.isOpen ? (
            <Link
              href="/retreatkeluarga2026/registration"
              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition"
            >
              Daftar Sekarang
            </Link>
          ) : (
            <div className="flex-1 bg-gray-300 text-gray-500 text-center py-4 rounded-xl font-bold text-lg cursor-not-allowed">
              Pendaftaran Ditutup
            </div>
          )}
          <Link
            href="/retreatkeluarga2026/myregistration"
            className="flex-1 border-2 border-blue-600 text-blue-600 text-center py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition"
          >
            Pendaftaran Saya
          </Link>
        </div>
      </div>
    </div>
  );
}