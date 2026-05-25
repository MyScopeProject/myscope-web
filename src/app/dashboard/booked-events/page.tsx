import { redirect } from "next/navigation"

// Booked events are now part of the main dashboard ("My Events") page.
export default function BookedEventsRedirect() {
  redirect("/dashboard")
}
