"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
});

type FormData = z.infer<typeof schema>;

function toLocalDatetimeValue(isoString: string) {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditTimeDealPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["timedeal", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${id}`);
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
    if (data) {
      const d = data.timeDeal ?? data.data ?? data;
      reset({
        title: d.title,
        description: d.description,
        discountPrice: d.discountPrice ?? d.price,
        limitQuantity: d.limitQuantity ?? d.stockQuantity,
        startAt: d.startAt ? toLocalDatetimeValue(d.startAt) : "",
        endAt: d.endAt ? toLocalDatetimeValue(d.endAt) : "",
      });
    }
  }, [data, reset]);

  const onSubmit = async (formData: FormData) => {
    try {
      await api.patch(`/api/v1/timedeals/${id}`, {
        ...formData,
        startAt: new Date(formData.startAt).toISOString(),
        endAt: new Date(formData.endAt).toISOString(),
      });
      router.push("/seller/timedeals");
    } catch {
      setError("root", { message: "타임딜 수정에 실패했습니다. 다시 시도해주세요." });
    }
  };

  if (!user) return null;
  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 목록으로
      </button>
      <h1 className="text-2xl font-bold mb-6">타임딜 수정</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium mb-1">제목</label>
            <input {...register("title")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea {...register("description")} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">할인가 (원)</label>
              <input {...register("discountPrice", { valueAsNumber: true })} type="number" min={0}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
              {errors.discountPrice && <p className="text-red-500 text-xs mt-1">{errors.discountPrice.message}</p>}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">인당 구매 제한</label>
              <input {...register("limitQuantity", { valueAsNumber: true })} type="number" min={1}
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

          <p className="text-xs text-gray-400">* 상품 및 상태는 수정이 불가합니다.</p>
        </div>

        {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50">
          {isSubmitting ? "수정 중..." : "타임딜 수정"}
        </button>
      </form>
    </div>
  );
}
