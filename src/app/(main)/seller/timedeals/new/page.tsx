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
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 목록으로
      </button>
      <h1 className="text-2xl font-bold mb-6">타임딜 등록</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-700">기본 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1">상품 선택</label>
            <select {...register("productId")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white">
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
            <label className="block text-sm font-medium mb-1">타임딜 제목</label>
            <input {...register("title")} placeholder="타임딜 제목을 입력해주세요"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea {...register("description")} rows={3} placeholder="타임딜 설명을 입력해주세요"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">할인가 (원)</label>
              <input {...register("discountPrice", { valueAsNumber: true })} type="number" min={0} placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              {errors.discountPrice && <p className="text-red-500 text-xs mt-1">{errors.discountPrice.message}</p>}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">인당 구매 제한</label>
              <input {...register("limitQuantity", { valueAsNumber: true })} type="number" min={1} placeholder="1"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              {errors.limitQuantity && <p className="text-red-500 text-xs mt-1">{errors.limitQuantity.message}</p>}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">시작 시간</label>
              <input {...register("startAt")} type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt.message}</p>}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">종료 시간</label>
              <input {...register("endAt")} type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">초기 상태</label>
            <select {...register("status")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white">
              <option value="SCHEDULED">예정 (등록 후 시작 시간에 자동 시작)</option>
              <option value="IN_PROGRESS">즉시 시작</option>
            </select>
          </div>
        </div>

        {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50">
          {isSubmitting ? "등록 중..." : "타임딜 등록"}
        </button>
      </form>
    </div>
  );
}
