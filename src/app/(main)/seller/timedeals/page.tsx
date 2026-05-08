"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  SCHEDULED:   { label: "예정",   className: "text-blue-600 bg-blue-50" },
  IN_PROGRESS: { label: "진행중", className: "text-green-600 bg-green-50" },
  SOLD_OUT:    { label: "품절",   className: "text-yellow-600 bg-yellow-50" },
  ENDED:       { label: "종료",   className: "text-gray-500 bg-gray-100" },
};

export default function SellerTimeDealsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["seller-timedeals"],
    queryFn: async () => {
      const res = await api.get("/api/v1/timedeals?size=100&sort=createdAt,desc");
      return res.data;
    },
    enabled: !!user && (user.role === "SELLER" || user.role === "MASTER"),
  });

  if (!user) return null;

  const deals = data?.content ?? data?.data?.content ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">타임딜 관리</h1>
        <Link
          href="/seller/timedeals/new"
          className="px-4 py-2 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition text-sm"
        >
          + 타임딜 등록
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">등록된 타임딜이 없어요</p>
          <Link href="/seller/timedeals/new" className="text-sky-500 font-medium hover:underline">
            첫 타임딜 등록하기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">제목</th>
                <th className="px-5 py-3 text-left">할인가</th>
                <th className="px-5 py-3 text-left">상태</th>
                <th className="px-5 py-3 text-left">시작</th>
                <th className="px-5 py-3 text-left">종료</th>
                <th className="px-5 py-3 text-left">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deals.map((deal: any) => {
                const status = STATUS_LABEL[deal.status] ?? { label: deal.status, className: "text-gray-500 bg-gray-100" };
                return (
                  <tr key={deal.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium">{deal.title}</td>
                    <td className="px-5 py-3 text-sky-500 font-semibold">
                      {deal.price?.toLocaleString()}원
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {deal.startAt ? new Date(deal.startAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {deal.endAt ? new Date(deal.endAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-5 py-3">
                      {(deal.status === "SCHEDULED") && (
                        <Link
                          href={`/seller/timedeals/${deal.id}/edit`}
                          className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                        >
                          수정
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
