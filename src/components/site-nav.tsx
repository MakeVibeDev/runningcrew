"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "대시보드" },
  { href: "/records/upload", label: "기록 업로드" },
  { href: "/missions", label: "미션" },
  { href: "/crews", label: "크루" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
            RC
          </span>
          RunningCrew Mock
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 transition hover:bg-muted ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
