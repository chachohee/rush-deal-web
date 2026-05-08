"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // 실패해도 로컬 상태 초기화
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/timedeals", label: "타임딜", show: true },
    { href: "/orders", label: "내 주문", show: !!user },
    { href: "/mypage", label: "마이페이지", show: !!user },
    { href: "/seller/products", label: "상품관리", show: user?.role === "SELLER" || user?.role === "MASTER", highlight: "seller" },
    { href: "/seller/timedeals", label: "타임딜관리", show: user?.role === "SELLER" || user?.role === "MASTER", highlight: "seller" },
    { href: "/admin", label: "관리자", show: user?.role === "MASTER", highlight: "admin" },
  ].filter((l) => l.show);

  const linkClass = (highlight?: string) => {
    if (highlight === "admin") return "text-purple-600 hover:bg-purple-50";
    if (highlight === "seller") return "text-sky-600 hover:bg-sky-50 font-semibold";
    return "text-gray-700 hover:bg-sky-50 hover:text-sky-600";
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-sky-500 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/timedeals" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-black text-sky-500 tracking-tight">RUSH</span>
          <span className="text-xl font-black text-gray-900 tracking-tight">DEAL</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg transition ${linkClass(link.highlight)}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 데스크톱 우측 */}
        <div className="hidden md:flex items-center gap-2 text-sm shrink-0">
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-gray-500 text-xs hidden lg:block">
                {user.name}님 ({user.role === "MASTER" ? "관리자" : user.role === "SELLER" ? "판매자" : "일반회원"})
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-4 py-1.5 text-gray-700 hover:text-sky-600 transition font-medium">
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition font-semibold"
              >
                회원가입
              </Link>
            </>
          )}
        </div>

        {/* 모바일 우측 */}
        <div className="flex md:hidden items-center gap-1" ref={menuRef}>
          <ThemeToggle />
          {!user && (
            <Link href="/login" className="text-sm text-sky-500 font-semibold px-2">
              로그인
            </Link>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            aria-label="메뉴 열기"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {menuOpen && (
            <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
              <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
                {user && (
                  <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 mb-1">
                    {user.name}님 ({user.role === "MASTER" ? "관리자" : user.role === "SELLER" ? "판매자" : "일반회원"})
                  </div>
                )}
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2.5 rounded-lg text-sm transition ${linkClass(link.highlight)}`}
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="mt-1 px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    로그아웃
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className="mt-1 px-3 py-2.5 text-sm text-center bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition"
                  >
                    회원가입
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
