"use client"

import * as React from "react"
import { redirect, useParams } from "next/navigation"

// The user's "registered event" detail view duplicates the public event detail
// page (which already handles isRegistered + unregister). Redirect to canonical.
export default function DashboardEventRedirectPage() {
  const params = useParams<{ id: string }>()
  React.useEffect(() => {
    if (params?.id) {
      redirect(`/events/${params.id}`)
    }
  }, [params?.id])
  return null
}
