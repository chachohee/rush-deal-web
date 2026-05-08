"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

export default function Header() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

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

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-sky-500 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/timedeals" className="flex items-center gap-2">
          <span className="text-xl font-black text-sky-500 tracking-tight">RUSH</span>
          <span className="text-xl font-black text-gray-900 tracking-tight">DEAL</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/timedeals" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition">
            타임딜
          </Link>
          {user && (
            <Link href="/orders" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition">
              내 주문
            </Link>
          )}
          {user && (
            <Link href="/mypage" className="px-3 py-2 rounded-lg text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition">
              마이페이지
            </Link>
          )}
          {(user?.role === "SELLER" || user?.role === "MASTER") && (
            <>
              <Link href="/seller/products" className="px-3 py-2 rounded-lg text-sky-600 hover:bg-sky-50 transition font-semibold">
                상품관리
              </Link>
              <Link href="/seller/timedeals" className="px-3 py-2 rounded-lg text-sky-600 hover:bg-sky-50 transition font-semibold">
                타임딜관리
              </Link>
            </>
          )}
          {user?.role === "MASTER" && (
            <Link href="/admin" className="px-3 py-2 rounded-lg text-purple-600 hover:bg-purple-50 transition font-semibold">
              관리자
            </Link>
          )}
        </nav>

        {/* 로그인/로그아웃 */}
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <span className="text-gray-500 text-xs hidden sm:block">
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
      </div>
    </header>
  );
}
