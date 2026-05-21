"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faLightbulb,
  faTriangleExclamation,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { BrowserMultiFormatReader, BrowserCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat, NotFoundException } from "@zxing/library";

// Module-level hints — stable across renders
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hints = new Map<DecodeHintType, any>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39]],
  [DecodeHintType.TRY_HARDER, true],
]);

const COOLDOWN_MS = 2500;
const PREPROCESS_INTERVAL_MS = 200; // preprocessing scan: 5 fps

type ScanResult = { name: string; isPresent: boolean } | null;
type ScanError = "not_found" | "error" | null;

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<ScanResult>(null);
  const [scanError, setScanError] = useState<ScanError>(null);

  // Refs prevent useEffect restarts on every scan
  const cooldownRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);

  // Stable function — reads only refs, no state deps
  const handleScannedCode = useCallback(async (studentId: string) => {
    // Normalize to lowercase so barcode (uppercase) and manual input match consistently
    const normalizedId = studentId.trim().toLowerCase();
    if (cooldownRef.current || normalizedId === lastScannedRef.current) return;
    cooldownRef.current = true;
    lastScannedRef.current = normalizedId;
    setScanError(null);

    try {
      const res = await fetch("/api/presence/kiosk-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: normalizedId }),
      });
      if (res.status === 404) {
        setScanError("not_found");
        setResult(null);
      } else if (res.ok) {
        const data = await res.json();
        setResult({ name: data.name, isPresent: data.isPresent });
        setScanError(null);
      } else {
        // Log the full error response so it appears in the browser console
        const body = await res.text().catch(() => "(could not read body)");
        console.error(
          `[kiosk-toggle] HTTP ${res.status} for studentId="${studentId}":`,
          body
        );
        setScanError("error");
        setResult(null);
      }
    } catch (err) {
      // Network-level failure (no connection, CORS, etc.)
      console.error(`[kiosk-toggle] fetch threw for studentId="${studentId}":`, err);
      setScanError("error");
      setResult(null);
    }

    setTimeout(() => {
      cooldownRef.current = false;
      setResult(null);
      setScanError(null);
      lastScannedRef.current = null;
    }, COOLDOWN_MS);
  }, []); // no state deps → stable reference

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const next = !torchOn;
    try {
      await BrowserCodeReader.mediaStreamSetTorch(track, next);
      setTorchOn(next);
    } catch {
      // torch not supported despite capability check
    }
  }, [torchOn]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use ZXing's own camera setup — more reliable than manual getUserMedia
    const reader = new BrowserMultiFormatReader(hints);
    let active = true;
    let preprocessInterval: ReturnType<typeof setInterval> | null = null;

    reader
      .decodeFromVideoDevice(undefined, video, (res, err) => {
        if (!active) return;
        if (res) handleScannedCode(res.getText());
        else if (err && !(err instanceof NotFoundException)) {
          // Unexpected decode error — NotFoundException is normal (no barcode in frame)
        }
      })
      .then((controls) => {
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setScanning(true);

        // Grab the stream ZXing started for torch support
        const stream = video.srcObject as MediaStream | null;
        if (stream) {
          streamRef.current = stream;
          setTorchAvailable(BrowserCodeReader.mediaStreamIsTorchCompatible(stream));
        }

        // --- Parallel preprocessing scan loop ---
        // ZXing's loop uses the raw frame.
        // This loop applies contrast enhancement before decoding,
        // which helps with faded/low-contrast barcodes on student IDs.
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        preprocessInterval = setInterval(() => {
          if (!active || video.readyState < /* HAVE_ENOUGH_DATA */ 4) return;

          // Lazily set canvas dimensions once real video dimensions are available
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return;
          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
          }

          // Draw with contrast/brightness boost to help ZXing binarize blurry barcodes
          ctx.filter = "grayscale(100%) contrast(200%) brightness(110%)";
          ctx.drawImage(video, 0, 0);
          ctx.filter = "none";

          try {
            const res = reader.decodeFromCanvas(canvas);
            if (active) handleScannedCode(res.getText());
          } catch (e) {
            if (!(e instanceof NotFoundException)) {
              console.error("preprocess scan error:", e);
            }
          }
        }, PREPROCESS_INTERVAL_MS);
      })
      .catch(() => {
        // Camera access denied or unavailable
      });

    return () => {
      active = false;
      if (preprocessInterval) clearInterval(preprocessInterval);
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current = null;
      setScanning(false);
      setTorchOn(false);
    };
  }, [handleScannedCode]); // handleScannedCode is stable → runs once

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const id = manualInput.trim();
      if (id) {
        handleScannedCode(id);
        setManualInput("");
      }
    },
    [manualInput, handleScannedCode]
  );

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

        {/* Scan guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-1/3 border-2 border-white/60 rounded-md" />
        </div>

        {/* Torch toggle (shows only when device supports it) */}
        {torchAvailable && (
          <button
            onClick={toggleTorch}
            className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur"
            aria-label={torchOn ? "ライトをOFFにする" : "ライトをONにする"}
          >
            <FontAwesomeIcon icon={faLightbulb} className="mr-1" />
            {torchOn ? "ON" : "OFF"}
          </button>
        )}

        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white text-sm">カメラを起動中…</p>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        学生証のバーコードをカメラにかざしてください
      </p>

      {/* Manual input — always visible */}
      <form onSubmit={handleManualSubmit} className="flex w-full gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="学籍番号を手動入力"
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40"
        />
        <button
          type="submit"
          className="rounded-lg bg-white px-4 py-2 font-bold text-black"
        >
          送信
        </button>
      </form>

      {/* Feedback popup overlay */}
      {(result || scanError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className={`rounded-2xl px-12 py-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
              result
                ? result.isPresent
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
                : scanError === "not_found"
                ? "bg-yellow-500 text-white"
                : "bg-gray-700 text-white"
            }`}
          >
            {result && (
              <>
                <p className="text-6xl mb-3">
                  <FontAwesomeIcon icon={result.isPresent ? faArrowRightToBracket : faArrowRightFromBracket} />
                </p>
                <p className="text-3xl font-bold">{result.name}</p>
                <p className="text-xl mt-2">
                  {result.isPresent ? "入室しました" : "退室しました"}
                </p>
              </>
            )}
            {scanError === "not_found" && (
              <>
                <p className="text-6xl mb-3">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                </p>
                <p className="text-2xl font-bold">学生証が見つかりません</p>
                <p className="text-sm mt-2">先にWebサイトでログインが必要です</p>
              </>
            )}
            {scanError === "error" && (
              <>
                <p className="text-6xl mb-3">
                  <FontAwesomeIcon icon={faCircleXmark} />
                </p>
                <p className="text-2xl font-bold">エラーが発生しました</p>
                <p className="text-sm mt-2">もう一度試してください</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
