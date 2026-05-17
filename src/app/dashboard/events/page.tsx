import { redirect } from "next/navigation"

// My events is now part of the main dashboard page.
export default function DashboardEventsRedirect() {
  redirect("/dashboard")
}
