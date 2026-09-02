import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { useAdminTranslation } from "../lib/i18n";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title?: string;
}

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    Html5Qrcode?: any;
    Html5QrcodeSupportedFormats?: Record<string, number>;
  }
}

const HTML5_QRCODE_CDN = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
let html5QrcodeLoader: Promise<void> | null = null;

const loadHtml5Qrcode = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser indisponível"));
  if (window.Html5Qrcode) return Promise.resolve();
  if (!html5QrcodeLoader) {
    html5QrcodeLoader = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${HTML5_QRCODE_CDN}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Falha ao carregar leitor de câmera.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = HTML5_QRCODE_CDN;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar leitor de câmera."));
      document.head.appendChild(script);
    });
  }
  return html5QrcodeLoader;
};

export function BarcodeScannerModal({ isOpen, onClose, onDetected, title }: BarcodeScannerModalProps) {
  const { t } = useAdminTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fallbackScannerRef = useRef<any>(null);
  const fallbackRegionIdRef = useRef(`origin-html5-scanner-${Math.random().toString(16).slice(2)}`);
  const detectedRef = useRef(false);
  // Ref "sempre atual" pro callback — evita que onDetected (arrow function nova a cada render
  // do componente pai) force o efeito abaixo a reabrir a câmera a cada re-render (ex.: Products.tsx
  // re-renderiza a cada tick do cooldown de IA, o que fazia a câmera reiniciar ~1x/segundo).
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  const stopCamera = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const scanner = fallbackScannerRef.current;
    fallbackScannerRef.current = null;
    if (scanner) {
      Promise.resolve(scanner.stop?.())
        .catch(() => undefined)
        .finally(() => scanner.clear?.());
    }
  };

  const finishDetected = (raw: string) => {
    const code = String(raw || "").trim();
    if (!code || detectedRef.current) return;
    detectedRef.current = true;
    stopCamera();
    onDetectedRef.current(code);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let canceled = false;
    detectedRef.current = false;

    const startNative = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t("scanner.no_camera_api"));
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (canceled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Detector = (window as any).BarcodeDetector as BarcodeDetectorLike;
      const detector = new Detector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "code_93", "upc_a", "upc_e", "qr_code"],
      });

      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes?.[0]?.rawValue?.trim();
          if (raw) finishDetected(raw);
        } catch {
          // Alguns frames podem falhar sem interromper o scanner.
        }
      }, 300);
    };

    const startFallback = async () => {
      setFallbackMode(true);
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t("scanner.no_camera_api"));
      }
      await loadHtml5Qrcode();
      if (canceled) return;
      if (!window.Html5Qrcode) throw new Error(t("scanner.unsupported"));

      const supported = window.Html5QrcodeSupportedFormats || {};
      const formatsToSupport = [
        supported.EAN_13,
        supported.EAN_8,
        supported.UPC_A,
        supported.UPC_E,
        supported.CODE_128,
        supported.CODE_39,
        supported.CODE_93,
        supported.QR_CODE,
      ].filter((value) => typeof value === "number");

      const scanner = new window.Html5Qrcode(fallbackRegionIdRef.current, { verbose: false });
      fallbackScannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333,
          formatsToSupport: formatsToSupport.length ? formatsToSupport : undefined,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        (decodedText: string) => finishDetected(decodedText),
        () => undefined,
      );
    };

    const start = async () => {
      setLoading(true);
      setError("");
      setFallbackMode(false);
      try {
        if ("BarcodeDetector" in window) {
          await startNative();
        } else {
          await startFallback();
        }
      } catch (err: any) {
        try {
          stopCamera();
          await startFallback();
        } catch (fallbackErr: any) {
          setError(fallbackErr?.message || err?.message || t("scanner.open_error"));
        }
      } finally {
        setLoading(false);
      }
    };

    start();

    return () => {
      canceled = true;
      stopCamera();
    };
  }, [isOpen, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-700 bg-brand-navylight shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 bg-brand-navydark/70 px-4 py-3">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <Camera className="h-5 w-5 text-brand-gold" />
            {title || t("scanner.title")}
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-brand-gold/30 bg-black sm:aspect-video">
            {fallbackMode ? (
              <div id={fallbackRegionIdRef.current} className="h-full w-full overflow-hidden [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover" />
            ) : (
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            )}
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-brand-gold/80 shadow-[0_0_30px_rgba(255,215,0,0.25)]" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-brand-gold">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-sm text-gray-300">{t("scanner.help")}</p>
          {error && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <button onClick={onClose} className="mt-4 w-full rounded-xl border border-gray-700 bg-[#171717] px-4 py-3 font-semibold text-gray-200 transition hover:border-brand-gold hover:text-brand-gold">
            {t("scanner.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
