"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const schema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().min(1, "설명을 입력해주세요"),
  discountPrice: z.number().min(0, "할인가를 입력해주세요"),
  limitQuantity: z.number().min(1, "인당 구매 제한 수량은 1 이상이어야 합니다"),
  startAt: z.string().min(1, "시작 시간을 입력해주세요"),
  endAt: z.string().min(1, "종료 시간을 입력해주세요"),
  status: z.enum(["SCHEDULED", "IN_PROGRESS"]),
  productId: z.string().min(1, "상품을 선택해주세요"),
});

type FormData = z.infer<typeof schema>;

const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors bg-white";
const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

export default function NewTimeDealPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const { data: productsData } = useQuery({
    queryKey: ["my-products"],
    queryFn: async () => {
      const res = await api.get("/api/v1/products?size=100");
      return res.data;
    },
    enabled: !!user,
  });

  const products = productsData?.content ?? productsData?.data?.content ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "SCHEDULED" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/api/v1/timedeals", {
        ...data,
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
      });
      router.push("/seller/timedeals");
    } catch {
      setError("root", { message: "타임딜 등록에 실패했습니다. 다시 시도해주세요." });
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-700 mb-6 tracking-wide transition-colors">
        ← 목록으로
      </button>
      <h1 className="text-2xl font-bold tracking-tight mb-6">타임딜 등록</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-px bg-gray-200">
        <div className="bg-white p-6 flex flex-col gap-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">기본 정보</p>

          <div>
            <label className={labelCls}>상품 선택</label>
            <select {...register("productId")} className={inputCls}>
              <option value="">상품을 선택해주세요</option>
              {products.map((p: any) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.companyName}) - {p.price?.toLocaleString()}원
                </option>
              ))}
            </select>
            {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
          </div>

          <div>
            <label className={labelCls}>타임딜 제목</label>
            <input {...register("title")} placeholder="타임딜 제목을 입력해주세요" className={inputCls} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className={labelCls}>설명</label>
            <textarea {...register("description")} rows={3} placeholder="타임딜 설명을 입력해주세요"
              className={inputCls + " resize-none"} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelCls}>할인가 (원)</label>
              <input {...register("discountPrice", { valueAsNumber: true })} type="number" min={0} placeholder="0" className={inputCls} />
              {errors.discountPrice && <p className="text-red-500 text-xs mt-1">{errors.discountPrice.message}</p>}
            </div>

            <div className="flex-1">
              <label className={labelCls}>인당 구매 제한</label>
              <input {...register("limitQuantity", { valueAsNumber: true })} type="number" min={1} placeholder="1" className={inputCls} />
              {errors.limitQuantity && <p className="text-red-500 text-xs mt-1">{errors.limitQuantity.message}</p>}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelCls}>시작 시간</label>
              <input {...register("startAt")} type="datetime-local" className={inputCls} />
              {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt.message}</p>}
            </div>

            <div className="flex-1">
              <label className={labelCls}>종료 시간</label>
              <input {...register("endAt")} type="datetime-local" className={inputCls} />
              {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>초기 상태</label>
            <select {...register("status")} className={inputCls}>
              <option value="SCHEDULED">예정 (등록 후 시작 시간에 자동 시작)</option>
              <option value="IN_PROGRESS">즉시 시작</option>
            </select>
          </div>
        </div>

        {errors.root && <p className="text-red-500 text-xs text-center py-2 bg-white">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40">
          {isSubmitting ? "등록 중..." : "타임딜 등록"}
        </button>
      </form>
    </div>
  );
}
