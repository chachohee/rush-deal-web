"use client";

import { useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import TimeDealCard from "@/components/timedeal/TimeDealCard";

const PAGE_SIZE = 12;

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["timedeal-search", q],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        q,
        page: String(pageParam),
        size: String(PAGE_SIZE),
      });
      const res = await api.get(`/api/v1/timedeals/search?${params}`);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const page = lastPage?.data ?? lastPage;
      if (page?.last) return undefined;
      const current = page?.number ?? page?.pageable?.pageNumber ?? 0;
      return current + 1;
    },
    initialPageParam: 0,
    enabled: !!q,
  });

  const results: any[] = data?.pages.flatMap(
    (p) => p?.content ?? p?.data?.content ?? []
  ) ?? [];

  const totalElements: number =
    data?.pages[0]?.totalElements ??
    data?.pages[0]?.data?.totalElements ??
    results.length;

  return (
    <div>
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">검색 결과</p>
          <h1 className="text-2xl font-bold tracking-tight">
            &quot;<span className="text-blue-600">{q}</span>&quot;
          </h1>
        </div>
        <p className="text-xs text-zinc-400 tabular-nums">{totalElements}개</p>
      </div>

      {!q ? (
        <div className="text-center text-zinc-400 py-24 text-sm">검색어를 입력해주세요</div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center text-zinc-400 py-24 text-sm">검색 결과가 없습니다</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
            {results.map((deal: any) => (
              <TimeDealCard key={deal.id ?? deal.timeDealId} deal={deal} />
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
