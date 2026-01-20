"use client";

import { SidebarNav } from "@/components/sidebar-nav";
import { Topbar } from "@/components/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="hidden md:block w-72 border-r bg-card">
          <SidebarNav />
        </aside>

        <div className="flex-1">
          <Topbar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
