"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

const STATUS_DOT: Record<string, { label: string; dot: string }> = {
  SCHEDULED:   { label: "예정",   dot: "bg-blue-500" },
  ACTIVE:      { label: "진행중", dot: "bg-green-500" },
  IN_PROGRESS: { label: "진행중", dot: "bg-green-500" },
  SOLD_OUT:    { label: "품절",   dot: "bg-yellow-500" },
  ENDED:       { label: "종료",   dot: "bg-zinc-300" },
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
        <h1 className="text-2xl font-bold tracking-tight">타임딜 관리</h1>
        <Link
          href="/seller/timedeals/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          + 타임딜 등록
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-px bg-gray-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 text-sm">
          <p className="mb-4">등록된 타임딜이 없어요</p>
          <Link href="/seller/timedeals/new" className="text-blue-600 font-medium hover:underline">
            첫 타임딜 등록하기
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-zinc-500 text-xs">
              <tr>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">제목</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">할인가</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">시작</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">종료</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals.map((deal: any) => {
                const s = STATUS_DOT[deal.status] ?? { label: deal.status, dot: "bg-zinc-300" };
                return (
                  <tr key={deal.timeDealId ?? deal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium">{deal.title}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">
                      {deal.price?.toLocaleString()}원
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <span className="text-xs text-zinc-500">{s.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs tabular-nums">
                      {deal.startAt ? new Date(deal.startAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs tabular-nums">
                      {deal.endAt ? new Date(deal.endAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-5 py-3">
                      {deal.status === "SCHEDULED" && (
                        <Link
                          href={`/seller/timedeals/${deal.timeDealId ?? deal.id}/edit`}
                          className="text-xs px-3 py-1.5 border border-gray-300 text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
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
