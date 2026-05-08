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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/timedeals" className="text-xl font-bold text-orange-500">
          ⏰ Rush Deal
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/timedeals" className="text-gray-600 hover:text-orange-500 transition">
            타임딜
          </Link>
          <Link href="/products" className="text-gray-600 hover:text-orange-500 transition">
            상품
          </Link>
          {user && (
            <Link href="/orders" className="text-gray-600 hover:text-orange-500 transition">
              내 주문
            </Link>
          )}
          {user && (
            <Link href="/mypage" className="text-gray-600 hover:text-orange-500 transition">
              마이페이지
            </Link>
          )}
          {(user?.role === "SELLER" || user?.role === "MASTER") && (
            <Link href="/seller/products" className="text-blue-600 hover:text-blue-700 transition font-semibold">
              상품관리
            </Link>
          )}
          {user?.role === "MASTER" && (
            <Link href="/admin" className="text-purple-600 hover:text-purple-700 transition font-semibold">
              관리자
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <button
                onClick={handleLogout}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-orange-500 transition">
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
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
