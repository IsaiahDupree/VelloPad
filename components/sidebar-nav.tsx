"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/books", label: "Books", icon: BookOpen },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/campaigns", label: "Admin", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="h-screen p-4">
      <div className="flex items-center justify-between pb-3">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          vellopad
        </Link>
        <div className="text-xs text-muted-foreground">studio</div>
      </div>

      <Separator />

      <ScrollArea className="h-[calc(100vh-160px)] pr-3">
        <div className="py-4 space-y-1">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      <div className="mt-4 rounded-xl border p-3 bg-background/50">
        <div className="text-sm font-medium">Finish your next chapter</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Your daily momentum streak starts here.
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Tip: Generate a proof copy when your preflight is clean.
        </div>
      </div>
    </div>
  );
}
