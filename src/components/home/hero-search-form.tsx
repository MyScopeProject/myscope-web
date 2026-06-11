'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Client island carved out of the homepage so the rest of the hero (and the
// whole page) can be a Server Component. Only this needs `useState` +
// `useRouter`; everything else is static enough to ship as pre-rendered HTML.
export function HeroSearchForm() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/events?search=${encodeURIComponent(q)}` : '/events');
  };

  return (
    <form onSubmit={handleSearch} className="mt-6 w-full max-w-xl sm:mt-8">
      <div className="group flex items-center gap-2 rounded-full bg-white p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-white/40 focus-within:ring-2 focus-within:ring-fuchsia-400/60">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search artists, venues, events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-full bg-transparent pl-11 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full px-6 shadow-md">
          Search
        </Button>
      </div>
    </form>
  );
}
