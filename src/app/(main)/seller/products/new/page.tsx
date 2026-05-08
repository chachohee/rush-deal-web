"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  optionRequests: z.array(
    z.object({
      size: z.string().min(1, "사이즈를 입력해주세요"),
      color: z.string().min(1, "색상을 입력해주세요"),
    })
  ).min(1, "옵션을 최소 1개 이상 추가해주세요"),
});

type FormData = z.infer<typeof schema>;

export default function NewProductPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "CLOTHES",
      optionRequests: [{ size: "", color: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "optionRequests" });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/api/v1/products", data);
      router.push("/seller/products");
    } catch {
      setError("root", { message: "상품 등록에 실패했습니다. 다시 시도해주세요." });
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 목록으로
      </button>
      <h1 className="text-2xl font-bold mb-6">상품 등록</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-700">기본 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1">회사명</label>
            <input {...register("companyName")} placeholder="브랜드명 또는 회사명"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상품명</label>
            <input {...register("productName")} placeholder="상품명을 입력해주세요"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상품 설명</label>
            <textarea {...register("description")} rows={3} placeholder="상품에 대한 설명을 입력해주세요"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">가격 (원)</label>
              <input {...register("price", { valueAsNumber: true })} type="number" min={0} placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select {...register("category")}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 옵션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">옵션 <span className="text-red-400 text-xs">(필수 1개 이상)</span></h2>
            <button type="button" onClick={() => append({ size: "", color: "" })}
              className="text-xs px-3 py-1.5 border border-orange-300 text-orange-500 rounded-lg hover:bg-orange-50 transition">
              + 옵션 추가
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <input {...register(`optionRequests.${index}.size`)} placeholder="사이즈 (예: S, M, L, XL)"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                {errors.optionRequests?.[index]?.size && (
                  <p className="text-red-500 text-xs mt-1">{errors.optionRequests[index]?.size?.message}</p>
                )}
              </div>
              <div className="flex-1">
                <input {...register(`optionRequests.${index}.color`)} placeholder="색상 (예: 블랙, 화이트)"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                {errors.optionRequests?.[index]?.color && (
                  <p className="text-red-500 text-xs mt-1">{errors.optionRequests[index]?.color?.message}</p>
                )}
              </div>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(index)}
                  className="mt-1 text-gray-400 hover:text-red-500 transition text-lg leading-none">
                  ×
                </button>
              )}
            </div>
          ))}
          {errors.optionRequests?.root && (
            <p className="text-red-500 text-xs">{errors.optionRequests.root.message}</p>
          )}
        </div>

        {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50">
          {isSubmitting ? "등록 중..." : "상품 등록"}
        </button>
      </form>
    </div>
  );
}
