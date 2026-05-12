"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { useToast } from "@/components/ui/Toast";
import PasswordInput from "@/components/ui/PasswordInput";

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

const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors";
const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

function AddressFormComp({
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
          <label className={labelCls}>수령인</label>
          <input {...register("recipientName")} className={inputCls} />
          {errors.recipientName && <p className="text-red-500 text-xs mt-1">{errors.recipientName.message}</p>}
        </div>
        <div>
          <label className={labelCls}>휴대폰</label>
          <input {...register("recipientPhone")} placeholder="01012345678" className={inputCls} />
          {errors.recipientPhone && <p className="text-red-500 text-xs mt-1">{errors.recipientPhone.message}</p>}
        </div>
      </div>
      <div>
        <label className={labelCls}>우편번호</label>
        <input {...register("zipCode")} placeholder="12345" maxLength={5} className={inputCls} />
        {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode.message}</p>}
      </div>
      <div>
        <label className={labelCls}>기본 주소</label>
        <input {...register("addressBase")} className={inputCls} />
        {errors.addressBase && <p className="text-red-500 text-xs mt-1">{errors.addressBase.message}</p>}
      </div>
      <div>
        <label className={labelCls}>상세 주소</label>
        <input {...register("addressDetail")} className={inputCls} />
        {errors.addressDetail && <p className="text-red-500 text-xs mt-1">{errors.addressDetail.message}</p>}
      </div>
      <div>
        <label className={labelCls}>배송 메시지 (선택)</label>
        <input {...register("deliveryMessage")} placeholder="문 앞에 놓아주세요" className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40">
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-300 text-sm font-medium text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { user, updateName, clearAuth } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | "new" | null>(null);
  const { toast } = useToast();

  const { data: pointData } = useQuery({
    queryKey: ["point-balance"],
    queryFn: async () => {
      const res = await api.get("/api/v1/points/balance");
      return res.data;
    },
    enabled: !!user,
  });
  const pointBalance: number = pointData?.balance ?? pointData?.data?.balance ?? 0;

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const { data: addresses = [] } = useQuery<ShippingAddress[]>({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/me/addresses");
      return res.data;
    },
    enabled: !!user,
  });

  const createAddress = useMutation({
    mutationFn: (data: AddressForm) => api.post("/api/v1/users/me/addresses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
      setEditingAddressId(null);
      toast("배송지가 추가되었습니다", "success");
    },
    onError: () => toast("배송지 추가에 실패했습니다", "error"),
  });

  const updateAddress = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddressForm }) =>
      api.put(`/api/v1/users/me/addresses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
      setEditingAddressId(null);
      toast("배송지가 수정되었습니다", "success");
    },
    onError: () => toast("배송지 수정에 실패했습니다", "error"),
  });

  const setDefault = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/users/me/addresses/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
      toast("기본 배송지가 변경되었습니다", "success");
    },
  });

  const deleteAddress = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/users/me/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
      toast("배송지가 삭제되었습니다", "success");
    },
  });

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
      setIsEditingProfile(false);
      toast("프로필이 수정되었습니다", "success");
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
    <div className="max-w-lg mx-auto flex flex-col gap-px bg-gray-200">

      {/* 프로필 */}
      <div className="bg-white">
        <div className="flex items-center gap-4 p-6 border-b border-gray-100">
          <div className="w-12 h-12 bg-gray-900 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {user.name?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">{user.name}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-400 mb-0.5">보유 포인트</p>
            <p className="text-base font-bold tabular-nums">
              {pointBalance.toLocaleString()}
              <span className="text-xs font-normal text-zinc-400 ml-0.5">P</span>
            </p>
          </div>
        </div>

        <div className="p-6">
          {isEditingProfile ? (
            <form onSubmit={handleSubmit(onProfileSubmit)} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>이름</label>
                <input {...register("name")} className={inputCls} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelCls}>
                  새 비밀번호 <span className="normal-case font-normal text-zinc-400">(변경 시에만 입력)</span>
                </label>
                <PasswordInput {...register("password")} placeholder="8자 이상" className={inputCls} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className={labelCls}>이메일</label>
                <p className="text-sm text-zinc-400 py-2">{user.email}</p>
              </div>
              {errors.root && <p className="text-red-500 text-xs">{errors.root.message}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40">
                  {isSubmitting ? "저장 중..." : "저장"}
                </button>
                <button type="button"
                  onClick={() => { reset({ name: user.name, password: "" }); setIsEditingProfile(false); }}
                  className="flex-1 py-2.5 border border-gray-300 text-sm font-medium text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">이름</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">이메일</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <button onClick={() => setIsEditingProfile(true)}
                className="mt-2 w-full py-2.5 border border-gray-300 text-sm font-medium text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
                프로필 수정
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 배송지 관리 */}
      <div className="bg-white">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-sm font-bold tracking-tight">배송지 관리</h2>
          {editingAddressId === null && (
            <button onClick={() => setEditingAddressId("new")}
              className="text-xs text-zinc-500 font-medium hover:text-gray-900 transition-colors">
              + 추가
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          {editingAddressId === "new" && (
            <div className="border border-gray-200 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">새 배송지</p>
              <AddressFormComp
                onSubmit={(data) => createAddress.mutate(data)}
                onCancel={() => setEditingAddressId(null)}
                isPending={createAddress.isPending}
              />
            </div>
          )}

          {addresses.length === 0 && editingAddressId !== "new" && (
            <p className="text-sm text-zinc-400 text-center py-4">등록된 배송지가 없습니다</p>
          )}

          {addresses.map((addr) => (
            <div key={addr.addressId}
              className={`border p-4 ${addr.isDefault ? "border-gray-900" : "border-gray-200"}`}>
              {editingAddressId === addr.addressId ? (
                <>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">배송지 수정</p>
                  <AddressFormComp
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
                        <span className="text-xs font-semibold text-blue-600 mr-2">기본</span>
                      )}
                      <span className="text-sm font-semibold">{addr.recipientName}</span>
                      <span className="text-sm text-zinc-400 ml-2">{addr.recipientPhone}</span>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => setEditingAddressId(addr.addressId)}
                        className="text-xs text-zinc-400 hover:text-gray-900 transition-colors">수정</button>
                      <button
                        onClick={() => { if (confirm("배송지를 삭제하시겠습니까?")) deleteAddress.mutate(addr.addressId); }}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">삭제</button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1.5">
                    [{addr.zipCode}] {addr.addressBase}, {addr.addressDetail}
                  </p>
                  {addr.deliveryMessage && (
                    <p className="text-xs text-zinc-400 mt-0.5">{addr.deliveryMessage}</p>
                  )}
                  {!addr.isDefault && (
                    <button onClick={() => setDefault.mutate(addr.addressId)}
                      className="mt-2 text-xs text-zinc-400 hover:text-blue-600 transition-colors">
                      기본 배송지로 설정
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 메뉴 */}
      <div className="bg-white">
        <button onClick={() => router.push("/orders")}
          className="w-full text-left px-6 py-4 text-sm font-medium flex justify-between items-center hover:bg-gray-50 transition-colors border-b border-gray-100">
          <span>내 주문 내역</span>
          <span className="text-zinc-400 text-xs">→</span>
        </button>
        <button onClick={handleLogout}
          className="w-full text-left px-6 py-4 text-sm font-medium text-red-500 flex justify-between items-center hover:bg-gray-50 transition-colors">
          <span>로그아웃</span>
          <span className="text-xs">→</span>
        </button>
      </div>

    </div>
  );
}
