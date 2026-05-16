'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, RefreshCw, Camera, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SCANNER_ROLES = new Set(['scanner', 'organizer', 'superadmin', 'moderator', 'event-manager']);

type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'error';

interface ScanResult {
  booking_reference: string;
  checked_in_at: string;
  number_of_tickets: number;
  attendee: { name: string; email: string };
  event: { title: string } | null;
}

export default function ScannerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Refs to hold the live scanner instance so we can stop it
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/auth/login?redirect=/scanner');
  }, [authLoading, user, router]);

  // Start/stop camera based on scanState
  useEffect(() => {
    if (scanState === 'scanning') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [scanState]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setCameraError('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode('qr-reader');
      scannerRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleQrSuccess,
        () => { /* suppress per-frame decode failures */ },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg.includes('permission') ? 'Camera permission denied.' : 'Could not start camera.');
      setScanState('idle');
      isScanningRef.current = false;
    }
  };

  const stopCamera = async () => {
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch { /* ignore stop errors */ }
    scannerRef.current = null;
    isScanningRef.current = false;
  };

  const handleQrSuccess = async (token: string) => {
    // Prevent firing multiple times for the same frame
    if (scanState !== 'scanning') return;
    setScanState('loading');
    await stopCamera();

    try {
      const res = await fetch(`${API_URL}/api/checkin/scan`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();

      if (body?.success) {
        setResult(body.data as ScanResult);
        setScanState('success');
      } else {
        setErrorMsg(body?.message || 'Check-in failed.');
        setScanState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setScanState('error');
    }
  };

  const reset = () => {
    setResult(null);
    setErrorMsg('');
    setScanState('scanning');
  };

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#07060A' }}>
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Role guard
  if (user && !SCANNER_ROLES.has(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#07060A' }}>
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-1">Access denied</p>
          <p className="text-gray-400 text-sm">You need a scanner or organizer role to use this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-24 px-4" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-md mx-auto py-10">
        <h1 className="text-2xl font-bold text-white mb-1">Ticket Scanner</h1>
        <p className="text-gray-400 text-sm mb-8">Point the camera at an attendee's QR ticket.</p>

        {/* Camera error banner */}
        {cameraError && (
          <div className="mb-4 p-3 rounded-xl text-sm text-red-400 border border-red-500/30 bg-red-500/10">
            {cameraError}
          </div>
        )}

        {/* ── IDLE ── */}
        {scanState === 'idle' && (
          <button
            type="button"
            onClick={() => setScanState('scanning')}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-dashed border-purple-500/40 text-purple-300 hover:border-purple-400 hover:text-purple-200 transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="font-semibold">Start scanning</span>
          </button>
        )}

        {/* ── SCANNING / LOADING ── camera viewfinder */}
        {(scanState === 'scanning' || scanState === 'loading') && (
          <div className="relative">
            {/* html5-qrcode mounts its video into this div */}
            <div
              id="qr-reader"
              className="rounded-2xl overflow-hidden w-full"
              style={{ minHeight: 300 }}
            />

            {/* Overlay while API call is in flight */}
            {scanState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                <Loader className="w-10 h-10 animate-spin text-purple-400" />
              </div>
            )}

            <p className="text-center text-gray-400 text-xs mt-3">
              Scanning… hold QR code steady inside the frame.
            </p>

            <button
              type="button"
              onClick={() => setScanState('idle')}
              className="mt-4 w-full py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {scanState === 'success' && result && (
          <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Checked in!</p>
                <p className="text-green-400 text-xs">{new Date(result.checked_in_at).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="border-t border-green-500/20 pt-4 space-y-2 text-sm">
              <Row label="Attendee" value={result.attendee.name} />
              <Row label="Email" value={result.attendee.email} />
              {result.event && <Row label="Event" value={result.event.title} />}
              <Row label="Tickets" value={String(result.number_of_tickets)} />
              <Row label="Reference" value={result.booking_reference} />
            </div>

            <button
              type="button"
              onClick={reset}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Scan next ticket
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {scanState === 'error' && (
          <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Check-in failed</p>
                <p className="text-red-400 text-sm mt-0.5">{errorMsg}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-white text-right font-medium">{value}</span>
    </div>
  );
}
