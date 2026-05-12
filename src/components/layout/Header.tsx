"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, clearAuth } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    setSearchTerm(pathname === "/search" ? (searchParams.get("q") ?? "") : "");
  }, [pathname, searchParams]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try { await api.post("/api/v1/auth/logout"); } catch { /* ignore */ }
    finally { clearAuth(); router.push("/timedeals"); }
  };

  const navLinks = [
    { href: "/timedeals",       label: "TIMEDEAL",   show: true },
    { href: "/orders",          label: "주문 내역",   show: !!user },
    { href: "/mypage",          label: "마이페이지",  show: !!user },
    { href: "/seller/products", label: "상품관리",    show: user?.role === "SELLER" },
    { href: "/seller/timedeals",label: "타임딜관리",  show: user?.role === "SELLER" },
    { href: "/admin",           label: "관리자",      show: user?.role === "MASTER" },
  ].filter((l) => l.show);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-8">
        {/* 로고 */}
        <Link href="/timedeals" className="shrink-0">
          <span className="text-base font-black tracking-[0.15em] text-gray-900">RUSH</span>
          <span className="text-base font-black tracking-[0.15em] text-blue-600 ml-1">DEAL</span>
        </Link>

        {/* 데스크톱 네비 */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-semibold tracking-widest transition-colors ${
                isActive(link.href)
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 검색바 */}
        <form onSubmit={onSearchSubmit} className="hidden md:flex flex-1 max-w-xs relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="타임딜 검색"
            className="w-full text-xs border border-gray-200 px-3 py-2 pr-9 outline-none focus:border-gray-900 transition-colors"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </form>

        {/* 데스크톱 우측 */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-xs text-gray-400 hidden lg:block">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                로그인
              </Link>
              <Link
                href="/signup"
                className="text-xs font-semibold px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 transition-colors tracking-wide"
              >
                회원가입
              </Link>
            </>
          )}
        </div>

        {/* 모바일 우측 */}
        <div className="flex md:hidden items-center gap-1" ref={menuRef}>
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="메뉴"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {menuOpen && (
            <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 z-50">
              <nav className="px-6 py-4 flex flex-col gap-1">
                <form onSubmit={onSearchSubmit} className="relative mb-3">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="타임딜 검색"
                    className="w-full text-sm border border-gray-200 px-3 py-2 pr-9 outline-none focus:border-gray-900 transition-colors"
                  />
                  <button type="submit" aria-label="검색" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </button>
                </form>
                {user && (
                  <p className="text-xs text-gray-400 pb-3 border-b border-gray-100 mb-2">
                    {user.name} · {user.role === "MASTER" ? "관리자" : user.role === "SELLER" ? "판매자" : "일반회원"}
                  </p>
                )}
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`py-2.5 text-sm font-medium transition-colors ${
                      isActive(link.href) ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3 border-t border-gray-100 mt-2">
                  {user ? (
                    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
                      로그아웃
                    </button>
                  ) : (
                    <div className="flex gap-4">
                      <Link href="/login" className="text-sm font-medium text-gray-500">로그인</Link>
                      <Link href="/signup" className="text-sm font-semibold text-blue-600">회원가입</Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
