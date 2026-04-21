// components/retreat/QRScanner.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  onScan: (registrationId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const isRunningRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
  if (scannerRef.current) return;

  const html5Qrcode = new Html5Qrcode("qr-reader");
  scannerRef.current = html5Qrcode;

  html5Qrcode
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        console.log("QR decoded:", JSON.stringify(decodedText));
        if (!isRunningRef.current) return;
        isRunningRef.current = false;
        html5Qrcode.stop()
          .catch(() => {})
          .finally(() => onScan(decodedText.trim())); // trim added
      },
      () => {}
    )
    .then(() => {
      isRunningRef.current = true;
      setStarted(true);
    })
    .catch((err) => {
      console.error("Camera error:", err);
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.");
    });

  return () => {
    if (isRunningRef.current) {
      isRunningRef.current = false;
      html5Qrcode.stop().catch(() => {});
    }
  };
}, []); // ← empty deps, stableOnScan never changes so this is safe

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {!started && !error && (
          <p className="text-sm text-gray-400 text-center py-4">Memulai kamera...</p>
        )}
        <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
        {error && (
          <div className="mt-3 space-y-2">
            <p className="text-red-500 text-sm">{error}</p>
            <p className="text-xs text-gray-400">
              Di Safari: buka Preferences → Websites → Camera → izinkan localhost
            </p>
          </div>
        )}
      </div>
    </div>
  );
}