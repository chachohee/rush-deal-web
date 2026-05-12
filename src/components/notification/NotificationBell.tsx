"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function NotificationBell() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<Client | null>(null);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/api/v1/notifications?size=20");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user,
  });

  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const res = await api.get("/api/v1/notifications/unread-count");
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/api/v1/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  useEffect(() => {
    if (!user || !accessToken) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const wsBase = apiBase.replace(/^http/, "ws");
    const client = new Client({
      brokerURL: `${wsBase}/api/v1/notifications/ws`,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5_000,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => {
      client.deactivate();
      stompRef.current = null;
    };
  }, [user, accessToken, queryClient]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const count = unread?.count ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
        className="relative p-1 text-zinc-500 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold">알림</h3>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-zinc-400 hover:text-gray-900 transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-400">알림이 없습니다</p>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                      setOpen(false);
                    }}
                    className={`px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                      n.isRead ? "hover:bg-gray-50" : "bg-blue-50/40 hover:bg-blue-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{n.title}</p>
                      {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-zinc-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link}>{content}</Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
