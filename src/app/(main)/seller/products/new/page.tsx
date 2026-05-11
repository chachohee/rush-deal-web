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

const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors bg-white";
const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

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
      <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-700 mb-6 tracking-wide transition-colors">
        ← 목록으로
      </button>
      <h1 className="text-2xl font-bold tracking-tight mb-6">상품 등록</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-px bg-gray-200">
        <div className="bg-white p-6 flex flex-col gap-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">기본 정보</p>

          <div>
            <label className={labelCls}>회사명</label>
            <input {...register("companyName")} placeholder="브랜드명 또는 회사명" className={inputCls} />
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
          </div>

          <div>
            <label className={labelCls}>상품명</label>
            <input {...register("productName")} placeholder="상품명을 입력해주세요" className={inputCls} />
            {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>}
          </div>

          <div>
            <label className={labelCls}>상품 설명</label>
            <textarea {...register("description")} rows={3} placeholder="상품에 대한 설명을 입력해주세요"
              className={inputCls + " resize-none"} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelCls}>가격 (원)</label>
              <input {...register("price", { valueAsNumber: true })} type="number" min={0} placeholder="0" className={inputCls} />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>

            <div className="flex-1">
              <label className={labelCls}>카테고리</label>
              <select {...register("category")} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              옵션 <span className="normal-case font-normal text-red-400">(필수 1개 이상)</span>
            </p>
            <button type="button" onClick={() => append({ size: "", color: "" })}
              className="text-xs px-3 py-1.5 border border-gray-300 text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
              + 옵션 추가
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <input {...register(`optionRequests.${index}.size`)} placeholder="사이즈 (예: S, M, L, XL)" className={inputCls} />
                {errors.optionRequests?.[index]?.size && (
                  <p className="text-red-500 text-xs mt-1">{errors.optionRequests[index]?.size?.message}</p>
                )}
              </div>
              <div className="flex-1">
                <input {...register(`optionRequests.${index}.color`)} placeholder="색상 (예: 블랙, 화이트)" className={inputCls} />
                {errors.optionRequests?.[index]?.color && (
                  <p className="text-red-500 text-xs mt-1">{errors.optionRequests[index]?.color?.message}</p>
                )}
              </div>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(index)}
                  className="mt-2 text-zinc-400 hover:text-red-500 transition-colors text-lg leading-none">
                  ×
                </button>
              )}
            </div>
          ))}
          {errors.optionRequests?.root && (
            <p className="text-red-500 text-xs">{errors.optionRequests.root.message}</p>
          )}
        </div>

        {errors.root && <p className="text-red-500 text-xs text-center py-2 bg-white">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40">
          {isSubmitting ? "등록 중..." : "상품 등록"}
        </button>
      </form>
    </div>
  );
}
