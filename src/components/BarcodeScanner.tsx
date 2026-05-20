"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

type ScanResult = {
  name: string;
  isPresent: boolean;
} | null;

type ScanError = "not_found" | "error" | null;

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [scanError, setScanError] = useState<ScanError>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const cooldownRef = useRef(false);

  const handleScannedCode = useCallback(async (studentId: string) => {
    if (cooldownRef.current || studentId === lastScanned) return;
    cooldownRef.current = true;
    setLastScanned(studentId);
    setScanError(null);

    try {
      const res = await fetch("/api/presence/kiosk-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (res.status === 404) {
        setScanError("not_found");
        setResult(null);
      } else if (res.ok) {
        const data = await res.json();
        setResult({ name: data.name, isPresent: data.isPresent });
        setScanError(null);
      } else {
        setScanError("error");
        setResult(null);
      }
    } catch {
      setScanError("error");
      setResult(null);
    }

    // Reset after 2.5 seconds
    setTimeout(() => {
      cooldownRef.current = false;
      setResult(null);
      setScanError(null);
      setLastScanned(null);
    }, 2500);
  }, [lastScanned]);

  useEffect(() => {
    if (!videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let active = true;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (!active) return;
        if (result) {
          handleScannedCode(result.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          // Ignore NotFoundException (no barcode in frame) — it fires continuously
        }
      })
      .then((controls) => {
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setScanning(true);
      })
      .catch(() => {
        // Camera access failed
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      setScanning(false);
    };
  }, [handleScannedCode]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Camera feed */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border-4 border-gray-700">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          autoPlay
          playsInline
        />
        {/* Scan overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-1/3 border-2 border-white/60 rounded-md" />
        </div>
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white text-sm">カメラを起動中…</p>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        学生証のバーコードをカメラにかざしてください
      </p>

      {/* Feedback */}
      {result && (
        <div
          className={`w-full rounded-xl p-6 text-center transition-all ${
            result.isPresent
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <p className="text-4xl mb-2">{result.isPresent ? "🟢" : "🔴"}</p>
          <p className="text-2xl font-bold">{result.name}</p>
          <p className="text-lg mt-1">
            {result.isPresent ? "在室しました" : "退室しました"}
          </p>
        </div>
      )}

      {scanError === "not_found" && (
        <div className="w-full rounded-xl p-6 text-center bg-yellow-500 text-white">
          <p className="text-4xl mb-2">⚠️</p>
          <p className="text-xl font-bold">学生証が見つかりません</p>
          <p className="text-sm mt-1">先にWebサイトでログインが必要です</p>
        </div>
      )}

      {scanError === "error" && (
        <div className="w-full rounded-xl p-6 text-center bg-gray-700 text-white">
          <p className="text-4xl mb-2">❌</p>
          <p className="text-xl font-bold">エラーが発生しました</p>
          <p className="text-sm mt-1">もう一度試してください</p>
        </div>
      )}
    </div>
  );
}
