import React from "react"
import { OrganizerShell } from "@/components/organizer/organizer-shell"

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <OrganizerShell>{children}</OrganizerShell>
}
