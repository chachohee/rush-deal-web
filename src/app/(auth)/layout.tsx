"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/timedeals">
            <span className="text-base font-black tracking-[0.15em] text-gray-900">RUSH</span>
            <span className="text-base font-black tracking-[0.15em] text-blue-600 ml-1">DEAL</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">{children}</main>
    </>
  );
}
