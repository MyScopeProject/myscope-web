import React from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Wraps /shop/orders/* in the same sidebar used by /dashboard/* so the
// buyer can navigate between My Events ↔ My Orders ↔ Profile without
// losing nav context. DashboardShell highlights items via pathname.startsWith.
export default function ShopOrdersLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
