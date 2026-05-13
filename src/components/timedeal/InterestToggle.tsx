"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

interface Props {
  timeDealId: string;
  size?: "sm" | "md";
}

export default function InterestToggle({ timeDealId, size = "sm" }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["interest", timeDealId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${timeDealId}/interest`);
      return res.data as { interested: boolean };
    },
    enabled: !!user,
  });

  const interested = data?.interested ?? false;

  const register = useMutation({
    mutationFn: () => api.post(`/api/v1/timedeals/${timeDealId}/interest`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["interest", timeDealId] });
      const prev = queryClient.getQueryData(["interest", timeDealId]);
      queryClient.setQueryData(["interest", timeDealId], { interested: true });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["interest", timeDealId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["interest", timeDealId] });
      queryClient.invalidateQueries({ queryKey: ["my-interested"] });
    },
  });

  const unregister = useMutation({
    mutationFn: () => api.delete(`/api/v1/timedeals/${timeDealId}/interest`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["interest", timeDealId] });
      const prev = queryClient.getQueryData(["interest", timeDealId]);
      queryClient.setQueryData(["interest", timeDealId], { interested: false });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["interest", timeDealId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["interest", timeDealId] });
      queryClient.invalidateQueries({ queryKey: ["my-interested"] });
    },
  });

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/signup");
      return;
    }
    if (interested) unregister.mutate();
    else register.mutate();
  };

  const iconSize = size === "md" ? "w-5 h-5" : "w-4 h-4";
  const padding = size === "md" ? "p-2" : "p-1";

  return (
    <button
      onClick={handle}
      aria-label={interested ? "관심 해제" : "관심 등록"}
      title={user ? (interested ? "관심 해제" : "관심 등록") : "로그인이 필요합니다"}
      className={`${padding} transition-colors ${
        interested ? "text-red-500" : "text-zinc-400 hover:text-red-500"
      }`}
    >
      {interested ? (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      )}
    </button>
  );
}
