"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
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

const EMPTY_MSG: Record<string, string> = {
  "":        "타임딜이 없습니다",
  ACTIVE:    "진행 중인 타임딜이 없습니다",
  SCHEDULED: "예정된 타임딜이 없습니다",
  ENDED:     "마감된 타임딜이 없습니다",
};

const PAGE_SIZE = 12;

export default function TimeDealsPage() {
  const [status, setStatus] = useState("");
  const user = useAuthStore((s) => s.user);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["timedeals", status],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        size: String(PAGE_SIZE),
        page: String(pageParam),
        sort: "createdAt,desc",
      });
      if (status) params.set("status", status);
      const res = await api.get(`/api/v1/timedeals?${params}`);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const page = lastPage?.data ?? lastPage;
      if (page?.last) return undefined;
      const current = page?.number ?? page?.pageable?.pageNumber ?? 0;
      return current + 1;
    },
    initialPageParam: 0,
  });

  const deals: any[] = data?.pages.flatMap(
    (p) => p?.content ?? p?.data?.content ?? []
  ) ?? [];

  const totalElements: number =
    data?.pages[0]?.totalElements ??
    data?.pages[0]?.data?.totalElements ??
    deals.length;

  return (
    <div>
      {!user && (
        <p className="mb-6 text-xs text-zinc-400">
          타임딜 참여 및 주문은 로그인이 필요합니다.
        </p>
      )}

      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">타임딜</h1>
        <p className="text-xs text-zinc-400 tabular-nums">{totalElements}개</p>
      </div>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center text-zinc-400 py-24 text-sm">
          {EMPTY_MSG[status] ?? "타임딜이 없습니다"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
            {deals.map((deal: any) => (
              <TimeDealCard key={deal.timeDealId ?? deal.id} deal={deal} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-8 py-2.5 border border-gray-300 text-sm font-medium text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-40"
              >
                {isFetchingNextPage ? "불러오는 중..." : "더보기"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
