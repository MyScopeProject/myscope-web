'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, AlertCircle, CheckCircle, Loader, Clock, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface OrganizerProfile {
  id: string;
  business_name: string;
  business_type: string | null;
  nic_or_br: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at?: string;
}

const emptyForm = {
  business_name: '',
  business_type: 'company',
  nic_or_br: '',
  phone: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
};

const inputClass =
  'w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans';
const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(30, 26, 43, 0.6)' };
const labelClass = 'block text-sm font-inter font-semibold mb-2.5 text-text-primary';

export default function BecomeOrganizerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/become-organizer');
    }
  }, [authLoading, user, router]);

  // Load current organizer profile (if any)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizers/me`, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (data?.success) {
          const p: OrganizerProfile | null = data.data?.profile ?? null;
          setProfile(p);
          // Pre-fill the form when the user is editing a rejected application
          if (p && p.verification_status === 'rejected') {
            setForm({
              business_name: p.business_name,
              business_type: p.business_type ?? 'company',
              nic_or_br: p.nic_or_br ?? '',
              phone: p.phone ?? '',
              bank_name: p.bank_name ?? '',
              bank_account_number: p.bank_account_number ?? '',
              bank_account_name: p.bank_account_name ?? '',
            });
          }
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.business_name.trim()) {
      setError('Business name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/organizers/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data?.success) {
        setProfile(data.data?.profile ?? null);
        setSuccess(data.message || 'Application submitted.');
      } else {
        // Conflict (already pending/approved) returns the existing profile
        if (data?.data?.profile) setProfile(data.data.profile);
        setError(data?.message || 'Submission failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#07060A' }}
      >
        <Loader className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#07060A' }}
    >
      {/* Soft gradient backdrop, matching auth pages */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(167, 139, 250, 0.12) 0%, transparent 50%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(255, 122, 198, 0.08) 0%, transparent 50%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full"
            style={{
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid rgba(167, 139, 250, 0.2)',
            }}
          >
            <Building2 className="w-8 h-8" style={{ color: '#A78BFA' }} />
          </div>
          <h1 className="text-4xl font-outfit font-bold mb-2 text-text-primary">Become an Organizer</h1>
          <p className="text-text-secondary font-plex-sans">
            Apply once. Our team reviews every application to keep MyScope trustworthy.
          </p>
        </div>

        {/* Status banners */}
        {profile?.verification_status === 'approved' && (
          <StatusBanner
            color="#10b981"
            icon={<CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />}
            title="You're an approved organizer"
            body="You can now create events and access the organizer dashboard."
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center mt-4 px-5 py-2.5 rounded-xl font-inter font-semibold text-sm"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
            >
              Go to dashboard →
            </Link>
          </StatusBanner>
        )}

        {profile?.verification_status === 'pending' && (
          <StatusBanner
            color="#f59e0b"
            icon={<Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />}
            title="Under review"
            body={`We received your application for "${profile.business_name}". Admins typically respond within 24 hours.`}
          />
        )}

        {profile?.verification_status === 'rejected' && (
          <StatusBanner
            color="#FF6B6B"
            icon={<XCircle className="w-5 h-5" style={{ color: '#FF6B6B' }} />}
            title="Application was not approved"
            body={profile.rejection_reason || 'No reason was provided. Edit your details and re-submit below.'}
          />
        )}

        {/* Form — shown when no profile, or to edit a rejected one */}
        {(!profile || profile.verification_status === 'rejected') && (
          <div
            className="relative backdrop-blur-sm rounded-2xl p-8 border"
            style={{
              backgroundColor: 'rgba(21, 18, 29, 0.5)',
              borderColor: 'rgba(196, 181, 253, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 mb-5 rounded-lg border"
                style={{
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  borderColor: 'rgba(255, 107, 107, 0.3)',
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FF6B6B' }} />
                <p className="text-sm font-plex-sans" style={{ color: '#FF6B6B' }}>
                  {error}
                </p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 mb-5 rounded-lg border"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                }}
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                <p className="text-sm font-plex-sans" style={{ color: '#10b981' }}>
                  {success}
                </p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass} htmlFor="business_name">
                  Business / organization name *
                </label>
                <input
                  id="business_name"
                  type="text"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Acme Events"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} htmlFor="business_type">
                    Type
                  </label>
                  <select
                    id="business_type"
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                    <option value="ngo">NGO</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="nic_or_br">
                    NIC or Business Reg. number
                  </label>
                  <input
                    id="nic_or_br"
                    type="text"
                    value={form.nic_or_br}
                    onChange={(e) => setForm({ ...form, nic_or_br: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="PV 12345"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="phone">
                  Contact phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="+94 77 123 4567"
                />
              </div>

              <div className="pt-2">
                <h3 className="text-text-primary font-inter font-semibold mb-3">Payout bank details</h3>
                <p className="text-sm text-text-secondary mb-4 font-plex-sans">
                  We'll use this account to pay out your event revenue.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} htmlFor="bank_name">
                    Bank
                  </label>
                  <input
                    id="bank_name"
                    type="text"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="Bank of Ceylon"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="bank_account_number">
                    Account number
                  </label>
                  <input
                    id="bank_account_number"
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="bank_account_name">
                  Account holder name
                </label>
                <input
                  id="bank_account_name"
                  type="text"
                  value={form.bank_account_name}
                  onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Acme Events Pvt Ltd"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-inter font-semibold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                  color: '#0a0712',
                }}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting…
                  </span>
                ) : profile?.verification_status === 'rejected' ? (
                  'Re-submit application'
                ) : (
                  'Submit application'
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatusBanner({
  color,
  icon,
  title,
  body,
  children,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-5 rounded-2xl border"
      style={{
        backgroundColor: `${color}1a`,
        borderColor: `${color}55`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="font-inter font-semibold text-text-primary mb-1">{title}</h2>
          <p className="text-text-secondary font-plex-sans text-sm leading-relaxed">{body}</p>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
