"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b-2 border-sky-500 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black text-sky-500 tracking-tight">RUSH</span>
            <span className="text-xl font-black text-gray-900 tracking-tight">DEAL</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">{children}</main>
    </>
  );
}
