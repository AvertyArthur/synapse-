"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { IS_DEMO } from "@/lib/demo";
import { BookIcon, CardsIcon, ChartIcon, GearIcon, HomeIcon } from "./Icons";

const NAV = [
  { href: "/", label: "Aujourd'hui", Icon: HomeIcon },
  { href: "/cours", label: "Cours", Icon: BookIcon },
  { href: "/session", label: "Réviser", Icon: CardsIcon },
  { href: "/progres", label: "Progrès", Icon: ChartIcon },
  { href: "/reglages", label: "Réglages", Icon: GearIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = pathname.startsWith("/session");

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production" && !IS_DEMO) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh md:flex">
      {!immersive && (
        <nav aria-label="Navigation principale" className="no-print hidden md:flex md:w-60 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-line md:bg-white md:p-4">
          <div className="mb-6 px-3 pt-2 font-display text-2xl font-bold">Synapse</div>
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${isActive(href) ? "bg-teal-tint text-teal font-semibold" : "text-muted hover:bg-ground"}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      )}
      <main className={`flex-1 ${immersive ? "" : "pb-24 md:pb-8"}`}>{children}</main>
      {!immersive && (
        <nav aria-label="Navigation principale" className="no-print fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-white px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 min-w-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive(href) ? "font-bold text-teal" : "font-medium text-muted"}`}
            >
              <Icon size={22} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
