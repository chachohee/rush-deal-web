"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

export default function SellerProductsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const res = await api.get("/api/v1/products?size=100&sort=createdAt,desc");
      return res.data;
    },
    enabled: !!user && (user.role === "SELLER" || user.role === "MASTER"),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/products/${id}/disable`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-products"] }),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/products/${id}/enable`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-products"] }),
  });

  if (!user) return null;

  const products = data?.content ?? data?.data?.content ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Link
          href="/seller/products/new"
          className="px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition text-sm"
        >
          + 상품 등록
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">등록된 상품이 없어요</p>
          <Link href="/seller/products/new" className="text-orange-500 font-medium hover:underline">
            첫 상품 등록하기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">상품명</th>
                <th className="px-5 py-3 text-left">회사명</th>
                <th className="px-5 py-3 text-left">가격</th>
                <th className="px-5 py-3 text-left">카테고리</th>
                <th className="px-5 py-3 text-left">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p: any) => (
                <tr key={p.productId} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium">{p.productName}</td>
                  <td className="px-5 py-3 text-gray-500">{p.companyName}</td>
                  <td className="px-5 py-3 text-orange-500 font-semibold">
                    {p.price?.toLocaleString()}원
                  </td>
                  <td className="px-5 py-3 text-gray-500">{p.category}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/seller/products/${p.productId}/edit`}
                        className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                      >
                        수정
                      </Link>
                      {p.status === "DISABLED" ? (
                        <button
                          onClick={() => enableMutation.mutate(p.productId)}
                          disabled={enableMutation.isPending}
                          className="text-xs px-3 py-1.5 border border-blue-300 text-blue-500 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                        >
                          활성화
                        </button>
                      ) : (
                        <button
                          onClick={() => disableMutation.mutate(p.productId)}
                          disabled={disableMutation.isPending}
                          className="text-xs px-3 py-1.5 border border-yellow-300 text-yellow-600 rounded-lg hover:bg-yellow-50 transition disabled:opacity-50"
                        >
                          비활성화
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("상품을 삭제하시겠습니까?")) {
                            deleteMutation.mutate(p.productId);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-xs px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
