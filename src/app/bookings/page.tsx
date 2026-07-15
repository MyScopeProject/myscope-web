'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Calendar, MapPin, AlertCircle, Loader, Send } from 'lucide-react';

// Event-side bookings — the only kind MyScope issues. The legacy movie
// bookings table is dropped; if you're hunting historical UI for it, check
// the git history before this commit.
interface EventBookingRow {
 id: string;
 booking_reference: string;
 number_of_tickets: number;
 ticket_price: number | string;
 total_amount: number | string;
 status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Refunded';
 payment_status: string;
 created_at: string;
 checked_in_at: string | null;
 // True when this booking was issued as a comp via the organizer's Invite
 // tab. Drives the small "Invitee ticket" tag on each row.
 is_invitation?: boolean;
 event?: {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  banner_url?: string | null;
 } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MyBookingsPage() {
 const router = useRouter();
 const { user } = useAuth();

 const [eventBookings, setEventBookings] = useState<EventBookingRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 useEffect(() => {
  if (!user) {
   router.push('/auth/login?redirect=/bookings');
   return;
  }
  fetchEventBookings();
 }, [user]);

 const fetchEventBookings = async () => {
  try {
   setLoading(true);
   setError('');
   const res = await fetch(`${API_URL}/api/event-bookings`, { credentials: 'include' });
   const data = await res.json();
   if (data?.success) {
    setEventBookings((data.data?.bookings ?? data.data ?? []) as EventBookingRow[]);
   } else {
    setError(data.message || 'Failed to load bookings');
   }
  } catch (err) {
   console.error('Event bookings fetch failed:', err);
   setError('Error fetching bookings');
  } finally {
   setLoading(false);
  }
 };

 if (loading) {
  return (
   <div className="pt-16 min-h-screen pb-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
     <div className="text-center py-12">
      <Loader className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
      <p className="font-inter text-muted-foreground">Loading your bookings...</p>
     </div>
    </div>
   </div>
  );
 }

 return (
  <div className="pt-16 min-h-screen pb-24">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    {/* Header */}
    <motion.div
     initial={{ opacity: 0, y: -20 }}
     animate={{ opacity: 1, y: 0 }}
     className="mb-12"
    >
     <h1 className="text-5xl md:text-6xl font-outfit font-bold mb-4 tracking-tight text-foreground">
      My Bookings
     </h1>
     <p className="text-lg font-inter text-muted-foreground">
      Manage your event bookings
     </p>
    </motion.div>

    {/* Error State */}
    {error && (
     <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive font-inter flex items-center gap-3"
     >
      <AlertCircle size={20} />
      <span>{error}</span>
     </motion.div>
    )}

    {/* Events list */}
    {eventBookings.length === 0 ? (
     <div className="border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-12 text-center">
      <div className="text-6xl mb-4">🎟️</div>
      <p className="text-xl font-outfit mb-2 text-foreground">No event bookings yet</p>
      <p className="font-inter mb-6 text-muted-foreground">Discover events happening near you.</p>
      <button
       type="button"
       onClick={() => router.push('/events')}
       className="px-6 py-3 rounded-lg font-inter font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
       Browse Events
      </button>
     </div>
    ) : (
     <div className="space-y-4">
      {eventBookings.map(eb => {
       const total = Number(eb.total_amount) || 0;
       // Per-row status chip. Confirmed splits into "Checked in" vs
       // "Confirmed" so the user can tell at a glance whether they've
       // already passed the gate for past events.
       const statusMeta = (() => {
        switch (eb.status) {
         case 'Confirmed': return { className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: eb.checked_in_at ? 'Checked in' : 'Confirmed' };
         case 'Pending':  return { className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Pending payment' };
         case 'Cancelled': return { className: 'bg-destructive/10 text-destructive', label: 'Cancelled' };
         case 'Refunded': return { className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'Refunded' };
         default:     return { className: 'bg-muted text-muted-foreground', label: eb.status };
        }
       })();

       return (
        <Link
         key={eb.id}
         href={`/bookings/event/${eb.id}`}
         className="block overflow-hidden border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm transition-colors hover:border-primary/40"
        >
         {/* Event banner: full-width strip on mobile, left thumbnail on desktop.
             Same visual language as the web event cards. */}
         <div className="flex flex-col sm:flex-row">
          {eb.event?.banner_url && (
           /* eslint-disable-next-line @next/next/no-img-element */
           <img
            src={eb.event.banner_url}
            alt=""
            aria-hidden="true"
            className="h-28 w-full shrink-0 object-cover sm:h-auto sm:w-44 sm:self-stretch"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
           />
          )}
          <div className="min-w-0 flex-1 p-4 sm:p-6">
         {/* On mobile: event info stacks above a 3-col mini-grid of meta.
           On md+: everything is a single 12-col row. The `md:contents`
           trick lets the mobile wrapper "vanish" at desktop so its
           children become direct grid items of the parent. */}
         <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
           <div className="flex flex-wrap items-start gap-2">
            <h3 className="text-base sm:text-lg font-outfit font-bold text-foreground line-clamp-2">
             {eb.event?.title ?? '(deleted event)'}
            </h3>
            {/* Comp-ticket marker: this booking was issued via the
              organizer's Invite tab, so it's a complimentary
              ticket rather than something the user purchased. */}
            {eb.is_invitation && (
             <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
              title="Complimentary ticket from the organizer"
             >
              <Send className="w-3 h-3" /> Invitee ticket
             </span>
            )}
           </div>
           <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-inter text-muted-foreground">
            {eb.event?.date && (
             <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(eb.event.date).toLocaleDateString()}
             </span>
            )}
            {eb.event?.location && (
             <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="line-clamp-1">{eb.event.location}</span>
             </span>
            )}
           </div>
           <p className="font-mono text-xs mt-2 text-primary">{eb.booking_reference}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:contents">
           <div className="md:col-span-2">
            <p className="text-[10px] uppercase font-inter text-muted-foreground">Tickets</p>
            <p className="font-outfit text-base sm:text-lg font-bold text-foreground">{eb.number_of_tickets}</p>
           </div>

           <div className="md:col-span-2">
            <p className="text-[10px] uppercase font-inter text-muted-foreground">Total</p>
            <p className="font-outfit text-base sm:text-lg font-bold text-primary whitespace-nowrap">
             LKR {total.toLocaleString()}
            </p>
           </div>

           <div className="md:col-span-3 flex md:block">
            <span className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-inter font-semibold ${statusMeta.className}`}>
             {statusMeta.label}
            </span>
           </div>
          </div>
          </div>
         </div>
         </div>
        </Link>
       );
      })}
     </div>
    )}
   </div>
  </div>
 );
}
