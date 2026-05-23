import type { Metadata } from "next"

const SITE = "https://www.myscope.lk"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Per-event metadata so each event page is indexed with its own title,
// description and share image (the detail page itself is a client component, so
// metadata lives here in the server layout that wraps it).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(`${API}/api/events/${id}`, { next: { revalidate: 600 } })
    const data = await res.json()
    const e = data?.data?.event
    if (!e?.title) return {}

    const title = e.title as string
    const description = ((e.description as string) || `Book tickets for ${title} on MyScope.`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160)
    const images = e.banner_url ? [e.banner_url as string] : undefined
    const url = `${SITE}/events/${id}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: "website", images },
      twitter: { card: "summary_large_image", title, description, images },
    }
  } catch {
    return {}
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children
}
