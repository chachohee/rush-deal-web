"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const CATEGORIES = ["CLOTHES", "SHOES", "BAG", "HEADWEAR", "ACCESSORY", "UNDERWEAR"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  CLOTHES: "옷", SHOES: "신발", BAG: "가방",
  HEADWEAR: "모자", ACCESSORY: "악세사리", UNDERWEAR: "속옷",
};

const schema = z.object({
  companyName: z.string().min(1, "회사명을 입력해주세요"),
  productName: z.string().min(1, "상품명을 입력해주세요"),
  description: z.string().min(1, "상품 설명을 입력해주세요"),
  price: z.number().min(0, "가격을 입력해주세요"),
  category: z.enum(CATEGORIES),
});

type FormData = z.infer<typeof schema>;

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (product) {
      const p = product.data ?? product;
      reset({
        companyName: p.companyName,
        productName: p.productName,
        description: p.description,
        price: p.price,
        category: p.category,
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await api.patch(`/api/v1/products/${id}`, data);
      router.push("/seller/products");
    } catch {
      setError("root", { message: "상품 수정에 실패했습니다. 다시 시도해주세요." });
    }
  };

  if (!user) return null;

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 목록으로
      </button>
      <h1 className="text-2xl font-bold mb-6">상품 수정</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">회사명</label>
            <input {...register("companyName")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400" />
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상품명</label>
            <input {...register("productName")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400" />
            {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상품 설명</label>
            <textarea {...register("description")} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 resize-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">가격 (원)</label>
              <input {...register("price", { valueAsNumber: true })} type="number" min={0}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400" />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select {...register("category")}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">* 옵션(사이즈/색상)은 수정이 불가합니다. 삭제 후 재등록해주세요.</p>
        </div>

        {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50">
          {isSubmitting ? "수정 중..." : "상품 수정"}
        </button>
      </form>
    </div>
  );
}
