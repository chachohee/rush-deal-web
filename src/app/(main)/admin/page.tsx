"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

type Tab = "users" | "timedeals" | "queue-policies";

const ROLE_DOT: Record<string, { label: string; dot: string }> = {
  USER:   { label: "일반회원", dot: "bg-zinc-300" },
  SELLER: { label: "판매자",   dot: "bg-blue-500" },
  MASTER: { label: "관리자",   dot: "bg-gray-900" },
};

const DEAL_STATUS_DOT: Record<string, { label: string; dot: string }> = {
  SCHEDULED:   { label: "예정",   dot: "bg-blue-500" },
  IN_PROGRESS: { label: "진행중", dot: "bg-green-500" },
  SOLD_OUT:    { label: "품절",   dot: "bg-yellow-500" },
  ENDED:       { label: "종료됨", dot: "bg-zinc-300" },
};

const POLICY_STATUS_DOT: Record<string, { label: string; dot: string }> = {
  RUNNING: { label: "실행중",   dot: "bg-green-500" },
  PAUSED:  { label: "일시정지", dot: "bg-yellow-500" },
  STOPPED: { label: "중단됨",   dot: "bg-red-400" },
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

const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors bg-white";
const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

function toLocalDatetimeValue(isoString: string) {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("users");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [selectedTimeDealId, setSelectedTimeDealId] = useState<string>("");
  const [selectedTimeDealStatus, setSelectedTimeDealStatus] = useState<string>("");
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

  // 대기열 정책 생성 폼용 타임딜 목록
  const { data: allDealsData } = useQuery({
    queryKey: ["admin-all-timedeals-for-policy"],
    queryFn: async () => {
      const res = await api.get("/api/v1/timedeals?size=100&sort=createdAt,desc");
      return res.data;
    },
    enabled: tab === "queue-policies" && user?.role === "MASTER",
  });

  // 선택한 타임딜 상세 (productId, 시간 자동 입력용)
  const { data: selectedDealDetail } = useQuery({
    queryKey: ["admin-timedeal-detail-for-policy", selectedTimeDealId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${selectedTimeDealId}`);
      return res.data;
    },
    enabled: !!selectedTimeDealId,
  });

  // 타임딜 선택 시 폼 자동 채우기
  useEffect(() => {
    if (!selectedDealDetail) return;
    const td = selectedDealDetail.timeDeal;
    const productId = selectedDealDetail.timeDealProdutResultList?.[0]?.productId ?? "";
    const title = td?.timeDealInfo?.title ?? "";
    const startAt = td?.period?.startAt;
    const endAt = td?.period?.endAt;
    const tdStatus: string = td?.status ?? "";
    const policyStatus = tdStatus === "IN_PROGRESS" ? "RUNNING" : "PAUSED";

    setSelectedTimeDealStatus(tdStatus);
    setForm((f) => ({
      ...f,
      productId: productId.toString(),
      dealName: title,
      startTime: startAt ? toLocalDatetimeValue(startAt) : f.startTime,
      endTime: endAt ? toLocalDatetimeValue(endAt) : f.endTime,
      status: policyStatus,
    }));
  }, [selectedDealDetail]);

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
      // SCHEDULED 타임딜 선택 시 시작/종료 시간도 동기화
      if (selectedTimeDealId && selectedTimeDealStatus === "SCHEDULED") {
        await api.patch(`/api/v1/timedeals/${selectedTimeDealId}`, {
          startAt: new Date(form.startTime).toISOString(),
          endAt: new Date(form.endTime).toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-timedeals"] });
      setShowCreateForm(false);
      setForm(EMPTY_FORM);
      setSelectedTimeDealId("");
      setSelectedTimeDealStatus("");
      setFormError("");
    },
    onError: () => setFormError("정책 생성에 실패했습니다. 입력값을 확인해주세요."),
  });

  if (!user || user.role !== "MASTER") return null;

  const deals = dealData?.content ?? dealData?.data?.content ?? [];
  const allDeals = allDealsData?.content ?? allDealsData?.data?.content ?? [];
  const policies = policyData?.data?.content ?? policyData?.content ?? [];

  const TAB_LABELS: Record<Tab, string> = {
    users: "유저 관리",
    timedeals: "타임딜 관리",
    "queue-policies": "대기열 정책",
  };

  const timesDisabled = selectedTimeDealId && selectedTimeDealStatus === "IN_PROGRESS";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">관리자 페이지</h1>

      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {(["users", "timedeals", "queue-policies"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-zinc-400 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 유저 관리 */}
      {tab === "users" && (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          {usersLoading ? (
            <div className="p-8 text-center text-zinc-400 text-sm">불러오는 중...</div>
          ) : (
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 text-zinc-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">이름</th>
                  <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">이메일</th>
                  <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">역할</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usersData?.map((u) => {
                  const role = ROLE_DOT[u.role] ?? { label: u.role, dot: "bg-zinc-300" };
                  return (
                    <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-zinc-400 tabular-nums">{u.userId}</td>
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-zinc-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${role.dot}`} />
                          <span className="text-xs text-zinc-500">{role.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 타임딜 관리 */}
      {tab === "timedeals" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href="/seller/timedeals/new"
              className="text-sm px-4 py-2 bg-gray-900 text-white font-semibold hover:bg-gray-700 transition-colors"
            >
              + 타임딜 등록
            </Link>
          </div>
          <div className="bg-white border border-gray-200 overflow-x-auto">
            {dealsLoading ? (
              <div className="p-8 text-center text-zinc-400 text-sm">불러오는 중...</div>
            ) : (
              <table className="w-full text-sm min-w-[580px]">
                <thead className="bg-gray-50 text-zinc-500 text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">타임딜명</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">할인가</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">상태</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">종료 시간</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deals.map((deal: any) => {
                    const s = DEAL_STATUS_DOT[deal.status] ?? { label: deal.status, dot: "bg-zinc-300" };
                    return (
                      <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium">{deal.title}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums">
                          {(deal.price ?? deal.discountPrice)?.toLocaleString()}원
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            <span className="text-xs text-zinc-500">{s.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-zinc-600 text-xs tabular-nums">
                          {deal.endAt ? new Date(deal.endAt).toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="px-5 py-3 flex items-center gap-2">
                          {deal.status === "SCHEDULED" && (
                            <Link
                              href={`/seller/timedeals/${deal.id}/edit`}
                              className="text-xs px-3 py-1.5 border border-gray-300 text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
                            >
                              수정
                            </Link>
                          )}
                          {deal.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => {
                                if (confirm("타임딜을 강제 종료하시겠습니까?")) {
                                  forceEnd.mutate(deal.id);
                                }
                              }}
                              disabled={forceEnd.isPending}
                              className="text-xs px-3 py-1.5 border border-gray-300 text-red-400 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
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
        </div>
      )}

      {/* 대기열 정책 */}
      {tab === "queue-policies" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowCreateForm((v) => !v);
                setFormError("");
                setSelectedTimeDealId("");
                setSelectedTimeDealStatus("");
                setForm(EMPTY_FORM);
              }}
              className="text-sm px-4 py-2 bg-gray-900 text-white font-semibold hover:bg-gray-700 transition-colors"
            >
              {showCreateForm ? "취소" : "+ 정책 생성"}
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">새 대기열 정책</h2>
              <div className="grid grid-cols-2 gap-4">

                {/* 타임딜 선택 (선택사항 — 자동 채우기용) */}
                <div className="col-span-2">
                  <label className={labelCls}>타임딜 선택 <span className="normal-case font-normal text-zinc-400">(선택 시 아래 항목 자동 입력)</span></label>
                  <select
                    value={selectedTimeDealId}
                    onChange={(e) => {
                      setSelectedTimeDealId(e.target.value);
                      if (!e.target.value) {
                        setSelectedTimeDealStatus("");
                        setForm(EMPTY_FORM);
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">타임딜을 선택하세요 (선택사항)</option>
                    {allDeals
                      .filter((d: any) => d.status === "SCHEDULED" || d.status === "IN_PROGRESS")
                      .map((d: any) => (
                        <option key={d.id} value={d.id}>
                          [{d.status === "IN_PROGRESS" ? "진행중" : "예정"}] {d.title}
                        </option>
                      ))}
                  </select>
                  {selectedTimeDealId && selectedTimeDealStatus === "IN_PROGRESS" && (
                    <p className="text-xs text-amber-600 mt-1">진행중인 타임딜은 시작/종료 시간이 수정되지 않습니다.</p>
                  )}
                </div>

                {/* 타임딜 이름 */}
                <div className="col-span-2">
                  <label className={labelCls}>타임딜 이름</label>
                  <input
                    value={form.dealName}
                    onChange={(e) => setForm((f) => ({ ...f, dealName: e.target.value }))}
                    placeholder="대기열 정책의 타임딜 이름"
                    className={inputCls}
                  />
                </div>

                {/* 초기 상태 */}
                <div>
                  <label className={labelCls}>초기 상태</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="RUNNING">실행중 (RUNNING)</option>
                    <option value="PAUSED">일시정지 (PAUSED)</option>
                    <option value="STOPPED">중단됨 (STOPPED)</option>
                  </select>
                </div>

                {/* 최대 허용 인원 */}
                <div>
                  <label className={labelCls}>최대 허용 인원</label>
                  <input
                    type="number" min={1}
                    value={form.maxCapacity}
                    onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>

                {/* 시작 시간 */}
                <div>
                  <label className={labelCls}>시작 시간</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    disabled={!!timesDisabled}
                    className={inputCls + (timesDisabled ? " opacity-40 cursor-not-allowed" : "")}
                  />
                </div>

                {/* 종료 시간 */}
                <div>
                  <label className={labelCls}>종료 시간</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    disabled={!!timesDisabled}
                    className={inputCls + (timesDisabled ? " opacity-40 cursor-not-allowed" : "")}
                  />
                </div>

                {/* 활성화 당 허용 인원 */}
                <div>
                  <label className={labelCls}>활성화 당 허용 인원</label>
                  <input
                    type="number" min={1}
                    value={form.limitSize}
                    onChange={(e) => setForm((f) => ({ ...f, limitSize: Number(e.target.value) }))}
                    className={inputCls}
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    활성 체크 주기마다 주문 가능 상태로 전환할 인원 수<br />
                    예) 10 → 매 주기마다 10명씩 활성화
                  </p>
                </div>

                {/* 활성 체크 주기 */}
                <div>
                  <label className={labelCls}>활성 체크 주기 (초)</label>
                  <input
                    type="number" min={1}
                    value={form.queueGap}
                    onChange={(e) => setForm((f) => ({ ...f, queueGap: Number(e.target.value) }))}
                    className={inputCls}
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    몇 초마다 대기열에서 활성열로 이동할지<br />
                    예) 5 → 5초마다 허용 인원만큼 활성화
                  </p>
                </div>

                {/* 토큰 TTL */}
                <div className="col-span-2">
                  <label className={labelCls}>토큰 TTL (초, 최소 60)</label>
                  <input
                    type="number" min={60}
                    value={form.ttl}
                    onChange={(e) => setForm((f) => ({ ...f, ttl: Number(e.target.value) }))}
                    className={inputCls}
                  />
                  <p className="text-xs text-zinc-400 mt-1">활성화된 유저의 주문 가능 시간. 이 시간 안에 주문하지 않으면 토큰 만료.</p>
                </div>
              </div>

              {formError && <p className="text-red-500 text-xs mt-3">{formError}</p>}

              <button
                onClick={() => createPolicy.mutate()}
                disabled={createPolicy.isPending}
                className="mt-4 w-full py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {createPolicy.isPending ? "생성 중..." : "정책 생성"}
              </button>
            </div>
          )}

          <div className="bg-white border border-gray-200 overflow-x-auto">
            {policiesLoading ? (
              <div className="p-8 text-center text-zinc-400 text-sm">불러오는 중...</div>
            ) : (
              <>
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50 text-zinc-500 text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">타임딜명</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">상태</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">시작</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">종료</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">활성화 인원</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">주기(초)</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {policies.map((p: any) => {
                      const ps = POLICY_STATUS_DOT[p.status] ?? { label: p.status, dot: "bg-zinc-300" };
                      return (
                        <tr key={p.policyId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium">{p.timeDealName}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                              <span className="text-xs text-zinc-500">{ps.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-zinc-600 text-xs tabular-nums">
                            {p.startTime ? new Date(p.startTime).toLocaleString("ko-KR") : "-"}
                          </td>
                          <td className="px-5 py-3 text-zinc-600 text-xs tabular-nums">
                            {p.endTime ? new Date(p.endTime).toLocaleString("ko-KR") : "-"}
                          </td>
                          <td className="px-5 py-3 text-zinc-600 tabular-nums">{p.limitSize}명</td>
                          <td className="px-5 py-3 text-zinc-600 tabular-nums">{p.queueGap}초</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => {
                                if (confirm("정책을 삭제하시겠습니까?")) {
                                  deletePolicy.mutate(p.policyId);
                                }
                              }}
                              disabled={deletePolicy.isPending}
                              className="text-xs px-3 py-1.5 border border-gray-300 text-red-400 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
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
                  <div className="p-8 text-center text-zinc-400 text-sm">등록된 대기열 정책이 없습니다</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
