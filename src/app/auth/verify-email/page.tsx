'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmail, resendVerification, user } = useAuth();

  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Hydrate email from query string or localStorage (register flow sets it)
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('email');
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('pendingVerificationEmail') : null;
    setEmail((fromQuery || fromStorage || '').trim());
  }, []);

  // If a verified user lands here, send them home
  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  // Tick down resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otp = digits.join('');
  const canSubmit = email && otp.length === OTP_LENGTH && !submitting;

  const handleDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    setDigits(prev => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputsRef.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setInfo('');
    const res = await verifyEmail(email, otp);
    if (res.success) {
      // Clear pending state and route to home
      if (typeof window !== 'undefined') localStorage.removeItem('pendingVerificationEmail');
      setInfo('Email verified! Redirecting…');
      setTimeout(() => router.replace('/'), 600);
    } else {
      setError(res.error || 'Verification failed. Double-check the code.');
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setError('');
    setInfo('');
    const res = await resendVerification(email);
    if (res.success) {
      setInfo('A new code has been sent (check your inbox).');
      setCooldown(RESEND_COOLDOWN_SEC);
    } else {
      setError(res.error || 'Could not resend code.');
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ backgroundColor: '#07060A' }}>
      <div
        className="w-full max-w-md rounded-2xl border p-8"
        style={{ backgroundColor: 'rgba(21, 18, 29, 0.5)', borderColor: 'rgba(196, 181, 253, 0.15)' }}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA' }}
          >
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify your email</h1>
          <p className="text-gray-400 text-sm mt-2 max-w-sm">
            Enter the 6-digit code we sent to{' '}
            <span className="text-white font-medium">{email || 'your email'}</span>.
            The code expires in 15 minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email (read-only when pre-filled; editable when user lands here cold) */}
          <div>
            <label htmlFor="verify-email-input" className="block text-xs text-gray-400 mb-1.5">
              Email
            </label>
            <input
              id="verify-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border bg-transparent text-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              style={{ borderColor: 'rgba(196,181,253,0.2)' }}
            />
          </div>

          {/* OTP digits */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Verification code</label>
            <div className="flex gap-2 justify-between">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  aria-label={`Digit ${i + 1}`}
                  className="w-full max-w-[48px] aspect-square text-center text-xl font-bold rounded-lg border bg-transparent text-white outline-none focus:border-purple-400"
                  style={{ borderColor: 'rgba(196,181,253,0.2)' }}
                />
              ))}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
              {error}
            </div>
          )}
          {info && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/25 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {info}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)', color: '#0a0712' }}
          >
            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : null}
            {submitting ? 'Verifying…' : 'Verify email'}
          </button>

          {/* Resend */}
          <div className="text-center text-sm">
            <span className="text-gray-400">Didn&apos;t get a code? </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!email || resending || cooldown > 0}
              className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {resending && <Loader className="w-3 h-3 animate-spin" />}
              {!resending && <RefreshCw className="w-3 h-3" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 text-xs text-gray-500">
          Already verified?{' '}
          <Link href="/auth/login" className="text-purple-300 hover:text-purple-200">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
