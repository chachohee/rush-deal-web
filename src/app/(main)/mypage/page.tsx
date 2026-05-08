"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const profileSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, { message: "비밀번호는 8자 이상이어야 합니다" }),
});

const shippingSchema = z.object({
  phone: z.string().min(1, "휴대폰 번호를 입력해주세요"),
  address: z.string().min(1, "배송지 주소를 입력해주세요"),
});

type ProfileForm = z.infer<typeof profileSchema>;
type ShippingForm = z.infer<typeof shippingSchema>;

const ROLE_LABEL: Record<string, string> = {
  USER: "일반회원",
  SELLER: "판매자",
  MASTER: "관리자",
};

export default function MyPage() {
  const router = useRouter();
  const { user, setAuth, updateProfile, clearAuth } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [shippingSuccess, setShippingSuccess] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
    setError: setProfileError,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", password: "" },
  });

  const {
    register: regShipping,
    handleSubmit: handleShippingSubmit,
    reset: resetShipping,
    formState: { errors: shippingErrors },
  } = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: { phone: user?.phone ?? "", address: user?.address ?? "" },
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      const body: Record<string, string> = { name: data.name };
      if (data.password) body.password = data.password;
      await api.put("/api/v1/users/me", body);
      if (user && accessToken) {
        setAuth(accessToken, { ...user, name: data.name });
      }
      setProfileSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError("root", { message: "수정에 실패했습니다. 다시 시도해주세요." });
    }
  };

  const onShippingSubmit = (data: ShippingForm) => {
    updateProfile({ phone: data.phone, address: data.address });
    setShippingSuccess(true);
    setIsEditingShipping(false);
    setTimeout(() => setShippingSuccess(false), 3000);
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

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400";

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      {(profileSuccess || shippingSuccess) && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          {profileSuccess ? "프로필이 수정되었습니다." : "배송지 정보가 저장되었습니다."}
        </div>
      )}

      {/* ── 프로필 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-200">
        <div className="p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-2xl font-bold text-sky-500 shrink-0">
            {user.name?.[0] ?? "?"}
          </div>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-500">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <div className="p-6">
          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input {...regProfile("name")} className={inputCls} />
                {profileErrors.name && <p className="text-red-500 text-xs mt-1">{profileErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 <span className="text-gray-400 font-normal">(변경 시에만 입력)</span>
                </label>
                <input {...regProfile("password")} type="password" placeholder="8자 이상" className={inputCls} />
                {profileErrors.password && <p className="text-red-500 text-xs mt-1">{profileErrors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <p className="text-sm text-gray-400 py-2">{user.email}</p>
              </div>
              {profileErrors.root && <p className="text-red-500 text-sm">{profileErrors.root.message}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={profileSubmitting}
                  className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50">
                  {profileSubmitting ? "저장 중..." : "저장"}
                </button>
                <button type="button" onClick={() => { resetProfile({ name: user.name, password: "" }); setIsEditingProfile(false); }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition">
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
              <button onClick={() => setIsEditingProfile(true)}
                className="mt-2 w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
                프로필 수정
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 배송지 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">배송지 정보</h2>
          {!isEditingShipping && (
            <button onClick={() => { resetShipping({ phone: user.phone ?? "", address: user.address ?? "" }); setIsEditingShipping(true); }}
              className="text-sm text-sky-500 hover:underline">
              {user.phone || user.address ? "수정" : "등록"}
            </button>
          )}
        </div>

        <div className="p-6">
          {isEditingShipping ? (
            <form onSubmit={handleShippingSubmit(onShippingSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
                <input {...regShipping("phone")} placeholder="010-0000-0000" className={inputCls} />
                {shippingErrors.phone && <p className="text-red-500 text-xs mt-1">{shippingErrors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">배송지 주소</label>
                <input {...regShipping("address")} placeholder="배송 받을 주소를 입력해주세요" className={inputCls} />
                {shippingErrors.address && <p className="text-red-500 text-xs mt-1">{shippingErrors.address.message}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit"
                  className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition">
                  저장
                </button>
                <button type="button" onClick={() => setIsEditingShipping(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition">
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">휴대폰</span>
                <span className={user.phone ? "font-medium" : "text-gray-300"}>
                  {user.phone || "미등록"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">주소</span>
                <span className={`${user.address ? "font-medium" : "text-gray-300"} text-right max-w-[60%]`}>
                  {user.address || "미등록"}
                </span>
              </div>
              {(!user.phone || !user.address) && (
                <p className="text-xs text-amber-500 mt-1">
                  배송지 정보를 등록하면 주문 시 자동으로 입력됩니다.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 메뉴 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col gap-1">
        <button onClick={() => router.push("/orders")}
          className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 transition text-sm font-medium flex justify-between items-center">
          <span>내 주문 내역</span>
          <span className="text-gray-400">→</span>
        </button>
        <button onClick={handleLogout}
          className="w-full text-left px-3 py-3 rounded-xl hover:bg-red-50 transition text-sm font-medium text-red-500 flex justify-between items-center">
          <span>로그아웃</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
