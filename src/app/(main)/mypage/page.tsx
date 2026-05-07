"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const schema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, { message: "비밀번호는 8자 이상이어야 합니다" }),
});

type FormData = z.infer<typeof schema>;

const ROLE_LABEL: Record<string, string> = {
  USER: "일반회원",
  SELLER: "판매자",
  MASTER: "관리자",
};

export default function MyPage() {
  const router = useRouter();
  const { user, setAuth, clearAuth } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const body: Record<string, string> = { name: data.name };
      if (data.password) body.password = data.password;

      await api.put("/api/v1/users/me", body);

      if (user && accessToken) {
        setAuth(accessToken, { ...user, name: data.name });
      }
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("root", { message: "수정에 실패했습니다. 다시 시도해주세요." });
    }
  };

  const handleCancel = () => {
    reset({ name: user?.name ?? "", password: "" });
    setIsEditing(false);
  };

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

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

      {saveSuccess && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          정보가 수정되었습니다.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {/* 프로필 헤더 */}
        <div className="p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-500">
            {user.name?.[0] ?? "?"}
          </div>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* 정보 / 수정 폼 */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  {...register("name")}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 <span className="text-gray-400 font-normal">(변경 시에만 입력)</span>
                </label>
                <input
                  {...register("password")}
                  type="password"
                  placeholder="8자 이상"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <p className="text-sm text-gray-400 py-2">{user.email}</p>
              </div>
              {errors.root && (
                <p className="text-red-500 text-sm">{errors.root.message}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">이름</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">이메일</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition text-sm"
              >
                정보 수정
              </button>
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <div className="p-4 flex flex-col gap-1">
          <button
            onClick={() => router.push("/orders")}
            className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 transition text-sm font-medium flex justify-between items-center"
          >
            <span>내 주문 내역</span>
            <span className="text-gray-400">→</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-3 rounded-xl hover:bg-red-50 transition text-sm font-medium text-red-500 flex justify-between items-center"
          >
            <span>로그아웃</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
