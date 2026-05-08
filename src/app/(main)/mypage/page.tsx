"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

/* ── 타입 ── */
interface ShippingAddress {
  addressId: number;
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  addressBase: string;
  addressDetail: string;
  deliveryMessage: string | null;
  isDefault: boolean;
}

/* ── 스키마 ── */
const profileSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  password: z.string().optional()
    .refine((v) => !v || v.length >= 8, { message: "비밀번호는 8자 이상이어야 합니다" }),
});

const addressSchema = z.object({
  recipientName: z.string().min(1, "수령인 이름을 입력해주세요"),
  recipientPhone: z.string().regex(/^01[0-9]{8,9}$/, "형식: 01012345678 (하이픈 없이)"),
  zipCode: z.string().regex(/^[0-9]{5}$/, "우편번호 5자리를 입력해주세요"),
  addressBase: z.string().min(1, "기본 주소를 입력해주세요"),
  addressDetail: z.string().min(1, "상세 주소를 입력해주세요"),
  deliveryMessage: z.string().max(100).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type AddressForm = z.infer<typeof addressSchema>;

const ROLE_LABEL: Record<string, string> = {
  USER: "일반회원", SELLER: "판매자", MASTER: "관리자",
};

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400";

/* ── 배송지 폼 컴포넌트 ── */
function AddressForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
}: {
  defaultValues?: Partial<AddressForm>;
  onSubmit: (data: AddressForm) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">수령인</label>
          <input {...register("recipientName")} className={inputCls} />
          {errors.recipientName && <p className="text-red-500 text-xs mt-0.5">{errors.recipientName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">휴대폰 (하이픈 없이)</label>
          <input {...register("recipientPhone")} placeholder="01012345678" className={inputCls} />
          {errors.recipientPhone && <p className="text-red-500 text-xs mt-0.5">{errors.recipientPhone.message}</p>}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">우편번호</label>
        <input {...register("zipCode")} placeholder="12345" maxLength={5} className={inputCls} />
        {errors.zipCode && <p className="text-red-500 text-xs mt-0.5">{errors.zipCode.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">기본 주소</label>
        <input {...register("addressBase")} className={inputCls} />
        {errors.addressBase && <p className="text-red-500 text-xs mt-0.5">{errors.addressBase.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">상세 주소</label>
        <input {...register("addressDetail")} className={inputCls} />
        {errors.addressDetail && <p className="text-red-500 text-xs mt-0.5">{errors.addressDetail.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">배송 메시지 (선택)</label>
        <input {...register("deliveryMessage")} placeholder="문 앞에 놓아주세요" className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="flex-1 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-50">
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
          취소
        </button>
      </div>
    </form>
  );
}

/* ── 메인 페이지 ── */
export default function MyPage() {
  const router = useRouter();
  const { user, updateName, clearAuth } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | "new" | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  /* 배송지 목록 */
  const { data: addresses = [] } = useQuery<ShippingAddress[]>({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/me/addresses");
      return res.data;
    },
    enabled: !!user,
  });

  /* 배송지 추가 */
  const createAddress = useMutation({
    mutationFn: (data: AddressForm) => api.post("/api/v1/users/me/addresses", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] }); setEditingAddressId(null); },
  });

  /* 배송지 수정 */
  const updateAddress = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddressForm }) =>
      api.put(`/api/v1/users/me/addresses/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] }); setEditingAddressId(null); },
  });

  /* 기본배송지 설정 */
  const setDefault = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/users/me/addresses/${id}/default`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] }),
  });

  /* 배송지 삭제 */
  const deleteAddress = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/users/me/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] }),
  });

  /* 프로필 폼 */
  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } =
    useForm<ProfileForm>({
      resolver: zodResolver(profileSchema),
      defaultValues: { name: user?.name ?? "", password: "" },
    });

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      const body: Record<string, string> = { name: data.name };
      if (data.password) body.password = data.password;
      await api.put("/api/v1/users/me", body);
      if (user && accessToken) updateName(data.name);
      setProfileSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setError("root", { message: "수정에 실패했습니다. 다시 시도해주세요." });
    }
  };

  const handleLogout = async () => {
    try { await api.post("/api/v1/auth/logout"); } catch { /* ignore */ }
    finally { clearAuth(); router.push("/login"); }
  };

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      {profileSuccess && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          프로필이 수정되었습니다.
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
            <form onSubmit={handleSubmit(onProfileSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input {...register("name")} className={inputCls} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 <span className="text-gray-400 font-normal">(변경 시에만 입력)</span>
                </label>
                <input {...register("password")} type="password" placeholder="8자 이상" className={inputCls} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <p className="text-sm text-gray-400 py-2">{user.email}</p>
              </div>
              {errors.root && <p className="text-red-500 text-sm">{errors.root.message}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50">
                  {isSubmitting ? "저장 중..." : "저장"}
                </button>
                <button type="button" onClick={() => { reset({ name: user.name, password: "" }); setIsEditingProfile(false); }}
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

      {/* ── 배송지 관리 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">배송지 관리</h2>
          {editingAddressId === null && (
            <button onClick={() => setEditingAddressId("new")}
              className="text-sm text-sky-500 font-medium hover:underline">
              + 배송지 추가
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* 새 배송지 폼 */}
          {editingAddressId === "new" && (
            <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
              <p className="text-sm font-semibold text-sky-600 mb-3">새 배송지</p>
              <AddressForm
                onSubmit={(data) => createAddress.mutate(data)}
                onCancel={() => setEditingAddressId(null)}
                isPending={createAddress.isPending}
              />
            </div>
          )}

          {/* 배송지 목록 */}
          {addresses.length === 0 && editingAddressId !== "new" && (
            <p className="text-sm text-gray-400 text-center py-4">등록된 배송지가 없습니다</p>
          )}

          {addresses.map((addr) => (
            <div key={addr.addressId}
              className={`border rounded-xl p-4 ${addr.isDefault ? "border-sky-300 bg-sky-50" : "border-gray-200"}`}>
              {editingAddressId === addr.addressId ? (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-3">배송지 수정</p>
                  <AddressForm
                    defaultValues={{
                      recipientName: addr.recipientName,
                      recipientPhone: addr.recipientPhone,
                      zipCode: addr.zipCode,
                      addressBase: addr.addressBase,
                      addressDetail: addr.addressDetail,
                      deliveryMessage: addr.deliveryMessage ?? "",
                    }}
                    onSubmit={(data) => updateAddress.mutate({ id: addr.addressId, data })}
                    onCancel={() => setEditingAddressId(null)}
                    isPending={updateAddress.isPending}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {addr.isDefault && (
                        <span className="text-xs font-semibold text-sky-500 bg-sky-100 px-2 py-0.5 rounded-full mr-2">
                          기본
                        </span>
                      )}
                      <span className="text-sm font-semibold">{addr.recipientName}</span>
                      <span className="text-sm text-gray-500 ml-2">{addr.recipientPhone}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setEditingAddressId(addr.addressId)}
                        className="text-xs text-gray-500 hover:text-gray-700">수정</button>
                      <button
                        onClick={() => { if (confirm("배송지를 삭제하시겠습니까?")) deleteAddress.mutate(addr.addressId); }}
                        className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    [{addr.zipCode}] {addr.addressBase}, {addr.addressDetail}
                  </p>
                  {addr.deliveryMessage && (
                    <p className="text-xs text-gray-400 mt-0.5">{addr.deliveryMessage}</p>
                  )}
                  {!addr.isDefault && (
                    <button onClick={() => setDefault.mutate(addr.addressId)}
                      className="mt-2 text-xs text-sky-500 hover:underline">
                      기본 배송지로 설정
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
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
