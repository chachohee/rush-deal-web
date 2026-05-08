"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import TimeDealCard from "@/components/timedeal/TimeDealCard";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

const STATUS_TABS = [
  { label: "전체",   value: "" },
  { label: "진행중", value: "ACTIVE" },
  { label: "예정",   value: "SCHEDULED" },
  { label: "마감",   value: "ENDED" },
];

export default function TimeDealsPage() {
  const [status, setStatus] = useState("");
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["timedeals", status],
    queryFn: async () => {
      const params = new URLSearchParams({ size: "12", sort: "createdAt,desc" });
      if (status) params.set("status", status);
      const res = await api.get(`/api/v1/timedeals?${params}`);
      return res.data;
    },
  });

  return (
    <div>
      {/* 비로그인 안내 */}
      {!user && (
        <div className="mb-8 px-4 py-3 border-l-2 border-blue-500 bg-blue-50 text-sm text-blue-700">
          타임딜 참여 및 상품 주문은 로그인이 필요합니다.
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">타임딜</h1>
        <p className="text-xs text-zinc-400 tabular-nums">
          {data?.content?.length ?? 0}개
        </p>
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-0 mb-8 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              status === tab.value
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-zinc-400 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : data?.content?.length === 0 ? (
        <div className="text-center text-zinc-400 py-24 text-sm">진행 중인 타임딜이 없습니다</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.content?.map((deal: any) => (
            <TimeDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
