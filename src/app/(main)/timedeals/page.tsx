"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import TimeDealCard from "@/components/timedeal/TimeDealCard";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

const STATUS_TABS = [
  { label: "전체", value: "" },
  { label: "진행중", value: "ACTIVE" },
  { label: "진행예정", value: "SCHEDULED" },
  { label: "마감", value: "ENDED" },
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
      {/* 비로그인 유저 안내 배너 */}
      {!user && (
        <div className="mb-6 px-5 py-4 bg-sky-50 border border-sky-200 rounded-2xl">
          <p className="text-sm text-sky-600">타임딜 참여 및 상품 주문은 로그인이 필요합니다. 마음에 드는 딜을 찾으셨다면 로그인 후 바로 참여해보세요!</p>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">타임딜</h1>

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              status === tab.value
                ? "bg-sky-500 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:border-sky-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data?.content?.length === 0 ? (
        <div className="text-center text-gray-400 py-20">진행 중인 타임딜이 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.content?.map((deal: any) => (
            <TimeDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
