"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

type Tab = "users" | "timedeals" | "queue-policies" | "products" | "audit-logs";

const AUDIT_ACTION_LABEL: Record<string, string> = {
  ROLE_CHANGED: "역할 변경",
  BLOCKED: "정지",
  UNBLOCKED: "정지 해제",
  DELETED: "삭제",
};

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
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("users");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [selectedTimeDealId, setSelectedTimeDealId] = useState<string>("");
  const [selectedTimeDealStatus, setSelectedTimeDealStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const queryClient = useQueryClient();

  // 패널 상태
  const [panel, setPanel] = useState<{ type: Tab; data: any } | null>(null);
  const [policyEditForm, setPolicyEditForm] = useState<any>(null);
  const [policyEditError, setPolicyEditError] = useState("");
  const [userRoleEdit, setUserRoleEdit] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router, mounted]);

  // 탭 변경 시 패널 닫기
  function switchTab(t: Tab) {
    setTab(t);
    setPanel(null);
    setSearchQuery("");
    setAuditActionFilter("");
  }

  // 패널에 유저가 선택되면 역할 초기화
  useEffect(() => {
    if (panel?.type === "users") setUserRoleEdit(panel.data.role ?? "USER");
  }, [panel]);

  // 패널에 정책이 선택되면 수정 폼 초기화
  useEffect(() => {
    if (panel?.type === "queue-policies") {
      const p = panel.data;
      setPolicyEditForm({
        timeDealName: p.timeDealName ?? "",
        status: p.status ?? "RUNNING",
        startTime: p.startTime ? toLocalDatetimeValue(p.startTime) : "",
        endTime: p.endTime ? toLocalDatetimeValue(p.endTime) : "",
        maxCapacity: p.maxCapacity ?? 100,
        limitSize: p.limitSize ?? 10,
        queueGap: p.queueGap ?? 5,
        ttl: p.ttl ?? 300,
      });
      setPolicyEditError("");
    }
  }, [panel]);

  // 유저 계정 관리 뮤테이션
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.patch(`/api/v1/users/${id}/role?role=${role}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
  });
  const blockUser = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/users/${id}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setPanel((p) => p ? { ...p, data: { ...p.data, isBlocked: true } } : null);
    },
  });
  const unblockUser = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/users/${id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setPanel((p) => p ? { ...p, data: { ...p.data, isBlocked: false } } : null);
    },
  });
  const deleteUser = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setPanel(null);
    },
  });

  // 상품 관리 쿼리 및 뮤테이션
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/api/v1/products?size=100&sort=createdAt,desc");
      return res.data;
    },
    enabled: tab === "products" && user?.role === "MASTER",
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs", auditActionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ size: "50" });
      if (auditActionFilter) params.set("action", auditActionFilter);
      const res = await api.get(`/api/v1/users/audit-logs?${params}`);
      return res.data;
    },
    enabled: tab === "audit-logs" && user?.role === "MASTER",
  });
  const disableProduct = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/products/${id}/disable`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  const enableProduct = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/products/${id}/enable`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

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
      const res = await api.get("/api/v1/timedeals/admin/all?size=50&sort=createdAt,desc");
      return res.data;
    },
    enabled: tab === "timedeals" && user?.role === "MASTER",
  });

  const forceEnd = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/timedeals/${id}/force-end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timedeals"] });
      queryClient.invalidateQueries({ queryKey: ["timedeals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] });
      setPanel(null);
    },
  });

  const { data: policyData, isLoading: policiesLoading } = useQuery({
    queryKey: ["admin-queue-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/queue/policies?size=50");
      return res.data;
    },
    enabled: tab === "queue-policies" && user?.role === "MASTER",
  });

  const { data: allDealsData } = useQuery({
    queryKey: ["admin-all-timedeals-for-policy"],
    queryFn: async () => {
      const res = await api.get("/api/v1/timedeals?size=100&sort=createdAt,desc");
      return res.data;
    },
    enabled: tab === "queue-policies" && user?.role === "MASTER",
  });

  const { data: selectedDealDetail } = useQuery({
    queryKey: ["admin-timedeal-detail-for-policy", selectedTimeDealId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${selectedTimeDealId}`);
      return res.data;
    },
    enabled: !!selectedTimeDealId,
  });

  // 패널용 타임딜 상세 조회
  const { data: panelDealDetail, isLoading: panelDealLoading } = useQuery({
    queryKey: ["panel-timedeal-detail", panel?.data?.id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${panel!.data.id}`);
      return res.data;
    },
    enabled: panel?.type === "timedeals" && !!panel?.data?.id,
  });

  // 패널 상품 목록의 상품 정보 조회 (중복 productId 제거)
  const panelProductIds = useMemo<string[]>(() => {
    if (panel?.type !== "timedeals") return [];
    const list: { productId: string }[] = panelDealDetail?.timeDealProdutResultList ?? [];
    return Array.from(new Set(list.map((p) => p.productId)));
  }, [panelDealDetail, panel?.type]);

  const panelProductQueries = useQueries({
    queries: panelProductIds.map((id) => ({
      queryKey: ["panel-product-detail", id],
      queryFn: async () => {
        const res = await api.get(`/api/v1/products/${id}`);
        return res.data;
      },
      enabled: !!id,
    })),
  });

  const panelProductMap = useMemo<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    panelProductIds.forEach((id, idx) => {
      const data = panelProductQueries[idx]?.data;
      if (data) map[id] = data;
    });
    return map;
  }, [panelProductIds, panelProductQueries]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] });
      setPanel(null);
    },
  });

  const updatePolicy = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.patch(`/api/v1/queue/policies/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue-policies"] });
      setPanel(null);
    },
    onError: () => setPolicyEditError("정책 수정에 실패했습니다."),
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
    onError: (err: any) => {
      const code = err?.response?.data?.data?.code ?? err?.response?.data?.code;
      if (code === "POLICY_ALREADY_EXISTS") {
        setFormError("이 상품에 대한 대기열 정책이 이미 존재합니다.");
      } else {
        setFormError("정책 생성에 실패했습니다. 입력값을 확인해주세요.");
      }
    },
  });

  if (!mounted || !user || user.role !== "MASTER") return null;

  const deals = dealData?.content ?? dealData?.data?.content ?? [];
  const allDeals = allDealsData?.content ?? allDealsData?.data?.content ?? [];
  const policies = policyData?.data?.policies ?? policyData?.policies ?? policyData?.data?.content ?? policyData?.content ?? [];

  const products = productsData?.content ?? productsData?.data?.content ?? [];

  const q = searchQuery.trim().toLowerCase();
  const includesQ = (s: any) => typeof s === "string" && s.toLowerCase().includes(q);
  const filteredUsers = q
    ? (usersData ?? []).filter((u: any) => includesQ(u.name) || includesQ(u.email))
    : (usersData ?? []);
  const filteredDeals = q
    ? deals.filter((d: any) => includesQ(d.title))
    : deals;
  const filteredPolicies = q
    ? policies.filter((p: any) => includesQ(p.timeDealName))
    : policies;
  const filteredProducts = q
    ? products.filter((p: any) => includesQ(p.productName) || includesQ(p.companyName) || includesQ(p.category))
    : products;
  const auditLogs: any[] = auditData?.content ?? auditData?.data?.content ?? [];
  const filteredAuditLogs = q
    ? auditLogs.filter((l: any) => includesQ(l.adminEmail) || includesQ(l.targetEmail) || includesQ(l.details))
    : auditLogs;

  const TAB_LABELS: Record<Tab, string> = {
    users: "유저 관리",
    timedeals: "타임딜 관리",
    "queue-policies": "대기열 정책",
    products: "상품 관리",
    "audit-logs": "감사 로그",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">관리자 페이지</h1>

      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {(["users", "timedeals", "queue-policies", "products", "audit-logs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
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

      {/* 검색바 */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            tab === "users" ? "이름 또는 이메일 검색" :
            tab === "timedeals" ? "타임딜명 검색" :
            tab === "queue-policies" ? "타임딜명 검색" :
            tab === "products" ? "상품명·회사명·카테고리 검색" :
            "관리자/대상 이메일·상세 검색"
          }
          className="flex-1 max-w-md text-sm border border-gray-200 px-3 py-2 outline-none focus:border-gray-900 transition-colors"
        />
        {tab === "audit-logs" && (
          <select
            value={auditActionFilter}
            onChange={(e) => setAuditActionFilter(e.target.value)}
            className="text-sm border border-gray-200 px-3 py-2 outline-none focus:border-gray-900 transition-colors bg-white"
          >
            <option value="">전체 액션</option>
            <option value="ROLE_CHANGED">역할 변경</option>
            <option value="BLOCKED">정지</option>
            <option value="UNBLOCKED">정지 해제</option>
            <option value="DELETED">삭제</option>
          </select>
        )}
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
                {filteredUsers.map((u: any) => {
                  const role = ROLE_DOT[u.role] ?? { label: u.role, dot: "bg-zinc-300" };
                  const isSelected = panel?.type === "users" && panel.data.userId === u.userId;
                  return (
                    <tr
                      key={u.userId}
                      onClick={() => setPanel({ type: "users", data: u })}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
                    >
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
                  {filteredDeals.map((deal: any) => {
                    const s = DEAL_STATUS_DOT[deal.status] ?? { label: deal.status, dot: "bg-zinc-300" };
                    const isSelected = panel?.type === "timedeals" && panel.data.id === deal.id;
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => setPanel({ type: "timedeals", data: deal })}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
                      >
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
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
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
                          </div>
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
                    <p className="text-xs text-amber-600 mt-1">진행중인 타임딜은 시간 변경 시 타임딜 정보에는 반영되지 않습니다.</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>타임딜 이름</label>
                  <input value={form.dealName} onChange={(e) => setForm((f) => ({ ...f, dealName: e.target.value }))} placeholder="대기열 정책의 타임딜 이름" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>초기 상태</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="RUNNING">실행중 (RUNNING)</option>
                    <option value="PAUSED">일시정지 (PAUSED)</option>
                    <option value="STOPPED">중단됨 (STOPPED)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>최대 허용 인원</label>
                  <input type="number" min={1} value={form.maxCapacity} onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>시작 시간</label>
                  <input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>종료 시간</label>
                  <input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>활성화 당 허용 인원</label>
                  <input type="number" min={1} value={form.limitSize} onChange={(e) => setForm((f) => ({ ...f, limitSize: Number(e.target.value) }))} className={inputCls} />
                  <p className="text-xs text-zinc-400 mt-1">매 주기마다 활성화할 인원 수</p>
                </div>
                <div>
                  <label className={labelCls}>활성 체크 주기 (초)</label>
                  <input type="number" min={1} value={form.queueGap} onChange={(e) => setForm((f) => ({ ...f, queueGap: Number(e.target.value) }))} className={inputCls} />
                  <p className="text-xs text-zinc-400 mt-1">몇 초마다 대기열에서 활성열로 이동할지</p>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>토큰 TTL (초, 최소 60)</label>
                  <input type="number" min={60} value={form.ttl} onChange={(e) => setForm((f) => ({ ...f, ttl: Number(e.target.value) }))} className={inputCls} />
                  <p className="text-xs text-zinc-400 mt-1">활성화된 유저의 주문 가능 시간</p>
                </div>
              </div>
              {formError && <p className="text-red-500 text-xs mt-3">{formError}</p>}
              <button onClick={() => createPolicy.mutate()} disabled={createPolicy.isPending} className="mt-4 w-full py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPolicies.map((p: any) => {
                      const ps = POLICY_STATUS_DOT[p.status] ?? { label: p.status, dot: "bg-zinc-300" };
                      const isSelected = panel?.type === "queue-policies" && panel.data.policyId === p.policyId;
                      return (
                        <tr
                          key={p.policyId}
                          onClick={() => setPanel({ type: "queue-policies", data: p })}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
                        >
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredPolicies.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 text-sm">등록된 대기열 정책이 없습니다</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 상품 관리 */}
      {tab === "products" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link href="/seller/products/new" className="text-sm px-4 py-2 bg-gray-900 text-white font-semibold hover:bg-gray-700 transition-colors">
              + 상품 등록
            </Link>
          </div>
          <div className="bg-white border border-gray-200 overflow-x-auto">
            {productsLoading ? (
              <div className="p-8 text-center text-zinc-400 text-sm">불러오는 중...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">{q ? "검색 결과가 없습니다" : "등록된 상품이 없습니다"}</div>
            ) : (
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 text-zinc-500 text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">상품명</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">회사명</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">가격</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">카테고리</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p: any) => (
                    <tr key={p.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium">{p.productName}</td>
                      <td className="px-5 py-3 text-zinc-600">{p.companyName}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{p.price?.toLocaleString()}원</td>
                      <td className="px-5 py-3 text-zinc-600">{p.category}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Link href={`/seller/products/${p.productId}/edit`} className="text-xs px-3 py-1.5 border border-gray-300 text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors">수정</Link>
                          {p.status === "DISABLED" ? (
                            <button onClick={() => enableProduct.mutate(p.productId)} disabled={enableProduct.isPending} className="text-xs px-3 py-1.5 border border-gray-300 text-blue-600 hover:border-blue-600 transition-colors disabled:opacity-40">활성화</button>
                          ) : (
                            <button onClick={() => disableProduct.mutate(p.productId)} disabled={disableProduct.isPending} className="text-xs px-3 py-1.5 border border-gray-300 text-zinc-600 hover:border-gray-900 transition-colors disabled:opacity-40">비활성화</button>
                          )}
                          <button
                            onClick={() => { if (confirm("상품을 삭제하시겠습니까?")) deleteProduct.mutate(p.productId); }}
                            disabled={deleteProduct.isPending}
                            className="text-xs px-3 py-1.5 border border-gray-300 text-red-400 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          >삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 감사 로그 */}
      {tab === "audit-logs" && (
          <div className="bg-white border border-gray-200 overflow-x-auto">
            {auditLoading ? (
              <div className="p-8 text-center text-zinc-400 text-sm">불러오는 중...</div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">{q || auditActionFilter ? "검색 결과가 없습니다" : "기록된 감사 로그가 없습니다"}</div>
            ) : (
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-zinc-500 text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">시간</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">관리자</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">액션</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">대상 유저</th>
                    <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAuditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-zinc-600 text-xs tabular-nums">
                        {new Date(log.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm">{log.adminEmail ?? "-"}</div>
                        <div className="text-xs text-zinc-400 tabular-nums">#{log.adminId}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold text-gray-900">
                          {AUDIT_ACTION_LABEL[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm">{log.targetEmail ?? "-"}</div>
                        <div className="text-xs text-zinc-400 tabular-nums">#{log.targetUserId}</div>
                      </td>
                      <td className="px-5 py-3 text-zinc-600 text-xs">{log.details ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
      )}

      {/* 백드롭 */}
      {panel && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setPanel(null)}
        />
      )}

      {/* 상세 패널 */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-200 ${
          panel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {panel && (
          <>
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">
                {panel.type === "users" && "유저 상세"}
                {panel.type === "timedeals" && "타임딜 상세"}
                {panel.type === "queue-policies" && "대기열 정책 상세"}
              </h2>
              <button
                onClick={() => setPanel(null)}
                className="text-zinc-400 hover:text-gray-900 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* 패널 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* 유저 패널 */}
              {panel.type === "users" && (() => {
                const u = panel.data;
                const role = ROLE_DOT[u.role] ?? { label: u.role, dot: "bg-zinc-300" };
                return (
                  <div>
                    <DetailRow label="ID" value={<span className="tabular-nums text-zinc-500">{u.userId}</span>} />
                    <DetailRow label="이름" value={u.name} />
                    <DetailRow label="이메일" value={<span className="text-zinc-600">{u.email}</span>} />
                    <DetailRow label="역할" value={
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${role.dot}`} />
                        <span>{role.label}</span>
                      </div>
                    } />
                    <DetailRow label="상태" value={
                      u.isBlocked
                        ? <span className="text-xs text-red-500 font-semibold">정지됨</span>
                        : u.isDeleted
                          ? <span className="text-xs text-zinc-400 font-semibold">삭제됨</span>
                          : <span className="text-xs text-green-600 font-semibold">정상</span>
                    } />

                    <div className="mt-5 flex flex-col gap-3">
                      <div>
                        <label className={labelCls}>역할 변경</label>
                        <div className="flex gap-2">
                          <select value={userRoleEdit} onChange={(e) => setUserRoleEdit(e.target.value)} className={inputCls}>
                            <option value="USER">일반회원 (USER)</option>
                            <option value="SELLER">판매자 (SELLER)</option>
                            <option value="MASTER">관리자 (MASTER)</option>
                          </select>
                          <button
                            onClick={() => changeRole.mutate({ id: u.userId, role: userRoleEdit })}
                            disabled={changeRole.isPending || userRoleEdit === u.role}
                            className="px-3 py-2 bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40 shrink-0"
                          >
                            변경
                          </button>
                        </div>
                      </div>

                      {u.isBlocked ? (
                        <button
                          onClick={() => unblockUser.mutate(u.userId)}
                          disabled={unblockUser.isPending}
                          className="w-full py-2.5 border border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40"
                        >
                          정지 해제
                        </button>
                      ) : (
                        <button
                          onClick={() => { if (confirm("이 계정을 정지하시겠습니까?")) blockUser.mutate(u.userId); }}
                          disabled={blockUser.isPending || u.isDeleted}
                          className="w-full py-2.5 border border-yellow-300 text-yellow-600 text-sm font-semibold hover:bg-yellow-50 transition-colors disabled:opacity-40"
                        >
                          계정 정지
                        </button>
                      )}

                      <button
                        onClick={() => { if (confirm("이 계정을 삭제하시겠습니까? 되돌릴 수 없습니다.")) deleteUser.mutate(u.userId); }}
                        disabled={deleteUser.isPending || u.isDeleted}
                        className="w-full py-2.5 border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        계정 삭제
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 타임딜 패널 */}
              {panel.type === "timedeals" && (() => {
                const deal = panel.data;
                const s = DEAL_STATUS_DOT[deal.status] ?? { label: deal.status, dot: "bg-zinc-300" };
                const detail = panelDealDetail;
                const products = detail?.timeDealProdutResultList ?? [];
                return (
                  <div>
                    <DetailRow label="타임딜명" value={deal.title} />
                    <DetailRow label="상태" value={
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <span>{s.label}</span>
                      </div>
                    } />
                    <DetailRow label="할인가" value={<span className="tabular-nums font-semibold">{(deal.price ?? deal.discountPrice)?.toLocaleString()}원</span>} />
                    <DetailRow label="시작" value={<span className="tabular-nums text-zinc-600 text-xs">{deal.startAt ? new Date(deal.startAt).toLocaleString("ko-KR") : "-"}</span>} />
                    <DetailRow label="종료" value={<span className="tabular-nums text-zinc-600 text-xs">{deal.endAt ? new Date(deal.endAt).toLocaleString("ko-KR") : "-"}</span>} />

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">상품 목록</p>
                      {panelDealLoading ? (
                        <p className="text-xs text-zinc-400">불러오는 중...</p>
                      ) : products.length === 0 ? (
                        <p className="text-xs text-zinc-400">상품 정보 없음</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {products.map((p: any, i: number) => {
                            const product = panelProductMap[p.productId];
                            const option = product?.productOptionsResult?.find(
                              (o: any) => o.optionId === p.productOptionId
                            );
                            const optionLabel = option
                              ? [option.size, option.color].filter(Boolean).join(" / ")
                              : null;
                            const isSoldOut = p.timeDealProductStatus === "OUT_OF_STOCK";
                            return (
                              <div key={i} className="text-xs bg-gray-50 px-3 py-2 border border-gray-100 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  {product ? (
                                    <>
                                      <div className="font-medium text-gray-900 truncate">{product.productName}</div>
                                      <div className="text-zinc-400 mt-0.5 truncate">
                                        {product.companyName}
                                        {optionLabel && <span className="ml-2">· {optionLabel}</span>}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-zinc-400">상품 정보 불러오는 중...</span>
                                  )}
                                </div>
                                <span className={`shrink-0 text-xs font-semibold ${isSoldOut ? "text-red-500" : "text-green-600"}`}>
                                  {isSoldOut ? "품절" : "판매중"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {deal.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => {
                          if (confirm("타임딜을 강제 종료하시겠습니까?")) forceEnd.mutate(deal.id);
                        }}
                        disabled={forceEnd.isPending}
                        className="mt-6 w-full py-2.5 border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        강제 종료
                      </button>
                    )}
                    {deal.status === "SCHEDULED" && (
                      <Link
                        href={`/seller/timedeals/${deal.id}/edit`}
                        className="mt-6 block w-full py-2.5 border border-gray-300 text-zinc-600 text-sm font-semibold text-center hover:border-gray-900 hover:text-gray-900 transition-colors"
                      >
                        수정
                      </Link>
                    )}
                  </div>
                );
              })()}

              {/* 대기열 정책 패널 */}
              {panel.type === "queue-policies" && policyEditForm && (() => {
                const p = panel.data;
                return (
                  <div>
                    <div className="mb-5">
                      <DetailRow label="상품 ID" value={<span className="tabular-nums font-mono text-xs text-zinc-500">{p.productId}</span>} />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className={labelCls}>타임딜 이름</label>
                        <input value={policyEditForm.timeDealName} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, timeDealName: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>상태</label>
                        <select value={policyEditForm.status} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, status: e.target.value }))} className={inputCls}>
                          <option value="RUNNING">실행중 (RUNNING)</option>
                          <option value="PAUSED">일시정지 (PAUSED)</option>
                          <option value="STOPPED">중단됨 (STOPPED)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>최대 허용 인원</label>
                        <input type="number" min={1} value={policyEditForm.maxCapacity} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, maxCapacity: Number(e.target.value) }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>시작 시간</label>
                        <input type="datetime-local" value={policyEditForm.startTime} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, startTime: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>종료 시간</label>
                        <input type="datetime-local" value={policyEditForm.endTime} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, endTime: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>활성화 당 허용 인원</label>
                        <input type="number" min={1} value={policyEditForm.limitSize} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, limitSize: Number(e.target.value) }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>활성 체크 주기 (초)</label>
                        <input type="number" min={1} value={policyEditForm.queueGap} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, queueGap: Number(e.target.value) }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>토큰 TTL (초)</label>
                        <input type="number" min={60} value={policyEditForm.ttl} onChange={(e) => setPolicyEditForm((f: any) => ({ ...f, ttl: Number(e.target.value) }))} className={inputCls} />
                      </div>
                    </div>

                    {policyEditError && <p className="text-red-500 text-xs mt-3">{policyEditError}</p>}

                    <button
                      onClick={() => updatePolicy.mutate({
                        id: p.policyId,
                        body: {
                          productId: p.productId,
                          timeDealName: policyEditForm.timeDealName,
                          status: policyEditForm.status,
                          startTime: policyEditForm.startTime,
                          endTime: policyEditForm.endTime,
                          maxCapacity: Number(policyEditForm.maxCapacity),
                          limitSize: Number(policyEditForm.limitSize),
                          queueGap: Number(policyEditForm.queueGap),
                          ttl: Number(policyEditForm.ttl),
                        },
                      })}
                      disabled={updatePolicy.isPending}
                      className="mt-4 w-full py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                      {updatePolicy.isPending ? "저장 중..." : "저장"}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("정책을 삭제하시겠습니까?")) deletePolicy.mutate(p.policyId);
                      }}
                      disabled={deletePolicy.isPending}
                      className="mt-2 w-full py-2.5 border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>
                );
              })()}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
