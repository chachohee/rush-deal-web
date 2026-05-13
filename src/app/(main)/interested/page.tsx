"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import TimeDealCard from "@/components/timedeal/TimeDealCard";

export default function InterestedPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-interested"],
    queryFn: async () => {
      const res = await api.get("/api/v1/timedeals/me/interested");
      return res.data as Array<{
        id: string;
        title: string;
        description: string;
        price: number;
        startAt: string;
        endAt: string;
        status: string;
      }>;
    },
    enabled: !!user,
  });

  if (!user) return null;

  const deals = data ?? [];

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">관심 타임딜</h1>
        <p className="text-xs text-zinc-400 tabular-nums">{deals.length}개</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center text-zinc-400 py-24 text-sm">
          관심 등록한 타임딜이 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
          {deals.map((deal) => (
            <TimeDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
