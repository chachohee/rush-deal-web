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

const EMPTY_FORM = {
  productId: "",
  dealName: "",
  status: "RUNNING",
  startTime: "",
  endTime: "",
  maxCapacity: 100,
  limitSize: 10,
  queueGap: 5,
  ttl: 300,
};

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("users");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/all");
      return res.data as { userId: number; email: string; name: string; role: string }[];
    },
    enabled: tab === "users" && user?.role === "MASTER",
  });

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

  const { data: policyData, isLoading: policiesLoading } = useQuery({
    queryKey: ["admin-queue-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/queue/policies?size=50");
      return res.data;
    },
    enabled: tab === "queue-policies" && user?.role === "MASTER",
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/api/v1/products?size=100");
      return res.data;
    },
    enabled: tab === "queue-policies" && user?.role === "MASTER",
  });

  const deletePolicy = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/queue/policies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] }),
  });

  const createPolicy = useMutation({
    mutationFn: async () => {
      await api.post("/api/v1/queue/policies", {
        productId: form.productId,
        dealName: form.dealName,
        status: form.status,
        startTime: form.startTime,
        endTime: form.endTime,
        maxCapacity: Number(form.maxCapacity),
        limitSize: Number(form.limitSize),
        queueGap: Number(form.queueGap),
        ttl: Number(form.ttl),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] });
      setShowCreateForm(false);
      setForm(EMPTY_FORM);
      setFormError("");
    },
    onError: () => setFormError("정책 생성에 실패했습니다. 입력값을 확인해주세요."),
  });

  if (!user || user.role !== "MASTER") return null;

  const deals = dealData?.content ?? dealData?.data?.content ?? [];
  const policies = policyData?.data?.content ?? policyData?.content ?? [];
  const products = productsData?.content ?? productsData?.data?.content ?? [];

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">관리자 페이지</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["users", "timedeals", "queue-policies"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "users" ? "유저 관리" : t === "timedeals" ? "타임딜 관리" : "대기열 정책"}
          </button>
        ))}
      </div>

      {/* ── 유저 관리 */}
      {tab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
              <tbody className="divide-y divide-gray-200">
                {usersData?.map((u) => {
                  const role = ROLE_LABEL[u.role] ?? { label: u.role, className: "text-gray-500 bg-gray-100" };
                  return (
                    <tr key={u.userId} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 text-gray-600">{u.userId}</td>
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-gray-700">{u.email}</td>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal: any) => {
                  const status = DEAL_STATUS_LABEL[deal.status] ?? { label: deal.status, className: "text-gray-500 bg-gray-100" };
                  return (
                    <tr key={deal.timeDealId} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-medium">{deal.productName ?? deal.product?.name ?? "-"}</td>
                      <td className="px-5 py-3 text-sky-500 font-semibold">
                        {deal.discountPrice?.toLocaleString()}원
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
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
        <div className="flex flex-col gap-4">
          {/* 정책 생성 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowCreateForm((v) => !v); setFormError(""); }}
              className="text-sm px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition font-semibold"
            >
              {showCreateForm ? "취소" : "+ 정책 생성"}
            </button>
          </div>

          {/* 정책 생성 폼 */}
          {showCreateForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-700 mb-4">새 대기열 정책</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">상품 선택</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                    className={inputCls + " bg-white"}
                  >
                    <option value="">상품을 선택해주세요</option>
                    {products.map((p: any) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} ({p.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">타임딜 이름</label>
                  <input
                    value={form.dealName}
                    onChange={(e) => setForm((f) => ({ ...f, dealName: e.target.value }))}
                    placeholder="대기열 정책의 타임딜 이름"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">초기 상태</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className={inputCls + " bg-white"}
                  >
                    <option value="RUNNING">실행중 (RUNNING)</option>
                    <option value="PAUSED">일시정지 (PAUSED)</option>
                    <option value="STOPPED">중단됨 (STOPPED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">최대 허용 인원</label>
                  <input
                    type="number" min={1}
                    value={form.maxCapacity}
                    onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">시작 시간</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">종료 시간</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">활성화 당 허용 인원 (limitSize)</label>
                  <input
                    type="number" min={1}
                    value={form.limitSize}
                    onChange={(e) => setForm((f) => ({ ...f, limitSize: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">활성 체크 주기 (queueGap)</label>
                  <input
                    type="number" min={1}
                    value={form.queueGap}
                    onChange={(e) => setForm((f) => ({ ...f, queueGap: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">토큰 TTL (초, 최소 60)</label>
                  <input
                    type="number" min={60}
                    value={form.ttl}
                    onChange={(e) => setForm((f) => ({ ...f, ttl: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}

              <button
                onClick={() => createPolicy.mutate()}
                disabled={createPolicy.isPending}
                className="mt-4 w-full py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50"
              >
                {createPolicy.isPending ? "생성 중..." : "정책 생성"}
              </button>
            </div>
          )}

          {/* 정책 목록 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                  <tbody className="divide-y divide-gray-200">
                    {policies.map((p: any) => {
                      const pStatus = POLICY_STATUS_LABEL[p.status] ?? { label: p.status, className: "text-gray-500 bg-gray-100" };
                      return (
                        <tr key={p.policyId} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-medium">{p.timeDealName}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pStatus.className}`}>
                              {pStatus.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            {p.startTime ? new Date(p.startTime).toLocaleString("ko-KR") : "-"}
                          </td>
                          <td className="px-5 py-3 text-gray-700">
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
        </div>
      )}
    </div>
  );
}
