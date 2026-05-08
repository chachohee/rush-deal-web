"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

type Tab = "users" | "timedeals" | "queue-policies";

const ROLE_LABEL: Record<string, { label: string; className: string }> = {
  USER:   { label: "일반회원", className: "text-gray-600 bg-gray-100" },
  SELLER: { label: "판매자",   className: "text-blue-600 bg-blue-50" },
  MASTER: { label: "관리자",   className: "text-purple-600 bg-purple-50" },
};

const DEAL_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "진행예정", className: "text-blue-600 bg-blue-50" },
  ACTIVE:    { label: "진행중",   className: "text-green-600 bg-green-50" },
  ENDED:     { label: "종료됨",   className: "text-gray-500 bg-gray-100" },
};

const POLICY_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  RUNNING: { label: "실행중",   className: "text-green-600 bg-green-50" },
  PAUSED:  { label: "일시정지", className: "text-yellow-600 bg-yellow-50" },
  STOPPED: { label: "중단됨",   className: "text-red-500 bg-red-50" },
};

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("users");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  // ── 유저 목록
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/all");
      return res.data as { userId: number; email: string; name: string; role: string }[];
    },
    enabled: tab === "users" && user?.role === "MASTER",
  });

  // ── 타임딜 목록
  const { data: dealData, isLoading: dealsLoading } = useQuery({
    queryKey: ["admin-timedeals"],
    queryFn: async () => {
      const res = await api.get("/api/v1/timedeals?size=50&sort=createdAt,desc");
      return res.data;
    },
    enabled: tab === "timedeals" && user?.role === "MASTER",
  });

  const forceEnd = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/timedeals/${id}/force-end`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-timedeals"] }),
  });

  // ── 대기열 정책
  const { data: policyData, isLoading: policiesLoading } = useQuery({
    queryKey: ["admin-queue-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/queue/policies?size=50");
      return res.data;
    },
    enabled: tab === "queue-policies" && user?.role === "MASTER",
  });

  const deletePolicy = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/queue/policies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] }),
  });

  if (!user || user.role !== "MASTER") return null;

  const deals = dealData?.content ?? dealData?.data?.content ?? [];
  const policies = policyData?.data?.content ?? policyData?.content ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">관리자 페이지</h1>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["users", "timedeals", "queue-policies"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "users" ? "유저 관리" : t === "timedeals" ? "타임딜 관리" : "대기열 정책"}
          </button>
        ))}
      </div>

      {/* ── 유저 관리 */}
      {tab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {usersLoading ? (
            <div className="p-8 text-center text-gray-400">불러오는 중...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">이름</th>
                  <th className="px-5 py-3 text-left">이메일</th>
                  <th className="px-5 py-3 text-left">역할</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersData?.map((u) => {
                  const role = ROLE_LABEL[u.role] ?? { label: u.role, className: "text-gray-500 bg-gray-100" };
                  return (
                    <tr key={u.userId} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 text-gray-400">{u.userId}</td>
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${role.className}`}>
                          {role.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── 타임딜 관리 */}
      {tab === "timedeals" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {dealsLoading ? (
            <div className="p-8 text-center text-gray-400">불러오는 중...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">상품명</th>
                  <th className="px-5 py-3 text-left">할인가</th>
                  <th className="px-5 py-3 text-left">상태</th>
                  <th className="px-5 py-3 text-left">종료 시간</th>
                  <th className="px-5 py-3 text-left">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deals.map((deal: any) => {
                  const status = DEAL_STATUS_LABEL[deal.status] ?? { label: deal.status, className: "text-gray-500 bg-gray-100" };
                  return (
                    <tr key={deal.timeDealId} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-medium">{deal.productName ?? deal.product?.name ?? "-"}</td>
                      <td className="px-5 py-3 text-orange-500 font-semibold">
                        {deal.discountPrice?.toLocaleString()}원
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {deal.endTime ? new Date(deal.endTime).toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="px-5 py-3">
                        {deal.status === "ACTIVE" && (
                          <button
                            onClick={() => {
                              if (confirm("타임딜을 강제 종료하시겠습니까?")) {
                                forceEnd.mutate(deal.timeDealId);
                              }
                            }}
                            disabled={forceEnd.isPending}
                            className="text-xs px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                          >
                            강제 종료
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── 대기열 정책 */}
      {tab === "queue-policies" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {policiesLoading ? (
            <div className="p-8 text-center text-gray-400">불러오는 중...</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">타임딜명</th>
                    <th className="px-5 py-3 text-left">상태</th>
                    <th className="px-5 py-3 text-left">시작</th>
                    <th className="px-5 py-3 text-left">종료</th>
                    <th className="px-5 py-3 text-left">최대 인원</th>
                    <th className="px-5 py-3 text-left">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {policies.map((p: any) => {
                    const status = POLICY_STATUS_LABEL[p.status] ?? { label: p.status, className: "text-gray-500 bg-gray-100" };
                    return (
                      <tr key={p.policyId} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 font-medium">{p.timeDealName}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {p.startTime ? new Date(p.startTime).toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {p.endTime ? new Date(p.endTime).toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="px-5 py-3">{p.limitSize}명</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => {
                              if (confirm("정책을 삭제하시겠습니까?")) {
                                deletePolicy.mutate(p.policyId);
                              }
                            }}
                            disabled={deletePolicy.isPending}
                            className="text-xs px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {policies.length === 0 && (
                <div className="p-8 text-center text-gray-400">등록된 대기열 정책이 없습니다</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
