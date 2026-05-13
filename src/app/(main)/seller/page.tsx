"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

interface TimeDeal {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  startAt: string;
  endAt: string;
  imageUrl?: string | null;
}

interface Product {
  productId: string;
  productName: string;
  companyName: string;
  price: number;
  category: string;
  imageUrl?: string | null;
}

interface Stock {
  stockId: string;
  productId: string;
  optionId: string;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  status: string;
  updatedAt: string;
}

interface OrderSummary {
  totalOrders: number;
  totalRevenue: number | string;
  ordersLast7Days: number;
  revenueLast7Days: number | string;
}

function fetchTimedealCount(status: string) {
  const qs = status ? `?status=${status}&size=1` : "?size=1";
  return api.get(`/api/v1/timedeals${qs}`).then((r) => {
    const page = r.data?.data ?? r.data;
    return page?.totalElements ?? 0;
  });
}

function KpiCard({
  label,
  value,
  href,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href?: string;
  hint?: string;
  tone?: "neutral" | "blue" | "amber" | "red";
}) {
  const toneCls = {
    neutral: "text-gray-900",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-500",
  }[tone];

  const inner = (
    <div className="bg-white border border-gray-200 p-5 hover:border-gray-400 transition-colors">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SELLER" && user.role !== "MASTER") router.replace("/timedeals");
  }, [user, router]);

  const enabled = !!user && (user.role === "SELLER" || user.role === "MASTER");

  const { data: inProgress = 0 } = useQuery({
    queryKey: ["seller-kpi-inprogress"],
    queryFn: () => fetchTimedealCount("IN_PROGRESS"),
    enabled,
  });
  const { data: scheduled = 0 } = useQuery({
    queryKey: ["seller-kpi-scheduled"],
    queryFn: () => fetchTimedealCount("SCHEDULED"),
    enabled,
  });
  const { data: ended = 0 } = useQuery({
    queryKey: ["seller-kpi-ended"],
    queryFn: () => fetchTimedealCount("ENDED"),
    enabled,
  });

  const { data: productsPage } = useQuery({
    queryKey: ["seller-recent-products"],
    queryFn: async () => {
      const r = await api.get("/api/v1/products?size=5&sort=createdAt,desc");
      return r.data?.data ?? r.data;
    },
    enabled,
  });
  const recentProducts: Product[] = productsPage?.content ?? [];
  const totalProducts: number = productsPage?.totalElements ?? 0;

  const { data: recentDealsPage } = useQuery({
    queryKey: ["seller-recent-timedeals"],
    queryFn: async () => {
      const r = await api.get("/api/v1/timedeals?size=5&sort=createdAt,desc");
      return r.data?.data ?? r.data;
    },
    enabled,
  });
  const recentDeals: TimeDeal[] = recentDealsPage?.content ?? [];

  const { data: lowStock = [] } = useQuery<Stock[]>({
    queryKey: ["seller-low-stock"],
    queryFn: async () => {
      const r = await api.get("/api/v1/stocks/seller/me/low?threshold=10&limit=5");
      return r.data?.data ?? r.data;
    },
    enabled,
  });

  const { data: orderSummary } = useQuery<OrderSummary>({
    queryKey: ["seller-order-summary"],
    queryFn: async () => {
      const r = await api.get("/api/v1/orders/seller/me/summary");
      return r.data?.data ?? r.data;
    },
    enabled,
  });

  const totalRevenue = Number(orderSummary?.totalRevenue ?? 0);
  const revenue7d = Number(orderSummary?.revenueLast7Days ?? 0);
  const totalOrders = orderSummary?.totalOrders ?? 0;
  const orders7d = orderSummary?.ordersLast7Days ?? 0;

  // 관심 등록자 합계: 최근 타임딜에 대한 카운트 sum
  const { data: interestCounts = [] } = useQuery<number[]>({
    queryKey: ["seller-interest-counts", recentDeals.map((d) => d.id).join(",")],
    queryFn: async () => {
      if (recentDeals.length === 0) return [];
      const results = await Promise.all(
        recentDeals.map((d) =>
          api
            .get(`/api/v1/timedeals/${d.id}/interest/count`)
            .then((r) => r.data?.count ?? r.data?.data?.count ?? 0)
            .catch(() => 0)
        )
      );
      return results;
    },
    enabled: enabled && recentDeals.length > 0,
  });
  const totalInterests = interestCounts.reduce((a, b) => a + b, 0);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {user.name} 판매자 · 한눈에 보는 운영 현황
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/seller/products/new"
            className="px-3 py-2 text-xs border border-gray-300 hover:border-gray-900 transition-colors"
          >
            + 상품 등록
          </Link>
          <Link
            href="/seller/timedeals/new"
            className="px-3 py-2 bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            + 타임딜 등록
          </Link>
        </div>
      </div>

      {/* KPI Row 1: 타임딜 상태 */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">타임딜</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 mb-8">
        <KpiCard label="진행 중" value={inProgress} tone="blue" href="/seller/timedeals" />
        <KpiCard label="예정" value={scheduled} tone="neutral" href="/seller/timedeals" />
        <KpiCard label="마감" value={ended} tone="neutral" href="/seller/timedeals" />
        <KpiCard label="등록 상품" value={totalProducts} href="/seller/products" />
      </div>

      {/* KPI Row 2: 매출/주문 */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">매출 · 주문</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 mb-8">
        <KpiCard
          label="누적 매출"
          value={`${totalRevenue.toLocaleString()}원`}
          tone="blue"
        />
        <KpiCard
          label="누적 주문"
          value={`${totalOrders.toLocaleString()}건`}
        />
        <KpiCard
          label="최근 7일 매출"
          value={`${revenue7d.toLocaleString()}원`}
          hint={`7일 ${orders7d.toLocaleString()}건`}
        />
        <KpiCard
          label="관심 등록자"
          value={totalInterests.toLocaleString()}
          hint="최근 타임딜 5개 합산"
        />
      </div>

      {/* 재고 부족 알림 */}
      <div className="mb-8">
        <div className="flex items-end justify-between mb-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            재고 부족 · 품절 임박
          </p>
          {lowStock.length > 0 && (
            <span className="text-xs text-amber-600 font-semibold">
              {lowStock.length}개 항목 주의
            </span>
          )}
        </div>
        {lowStock.length === 0 ? (
          <div className="bg-white border border-gray-200 p-6 text-center text-xs text-zinc-400">
            재고가 부족한 항목이 없습니다 (기준: 10개 미만)
          </div>
        ) : (
          <div className="bg-white border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-zinc-500 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider">재고 ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider">상품 ID</th>
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">남은 재고</th>
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">예약</th>
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">판매</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.map((s) => (
                  <tr key={s.stockId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                      {s.stockId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                      {s.productId.slice(0, 8)}…
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${
                      s.availableStock === 0 ? "text-red-500" : "text-amber-600"
                    }`}>
                      {s.availableStock}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                      {s.reservedStock}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                      {s.soldStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 최근 등록 타임딜 / 상품 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-end justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">최근 타임딜</p>
            <Link href="/seller/timedeals" className="text-xs text-zinc-400 hover:text-zinc-700">
              전체 보기 →
            </Link>
          </div>
          {recentDeals.length === 0 ? (
            <div className="bg-white border border-gray-200 p-6 text-center text-xs text-zinc-400">
              등록된 타임딜이 없습니다
            </div>
          ) : (
            <div className="bg-white border border-gray-200 flex flex-col divide-y divide-gray-100">
              {recentDeals.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/timedeals/${d.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {d.imageUrl ? (
                      <img src={d.imageUrl} alt={d.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-300">⏰</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {d.price?.toLocaleString()}원 · 관심 {interestCounts[i] ?? 0}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 tracking-wide flex-shrink-0">{d.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">최근 상품</p>
            <Link href="/seller/products" className="text-xs text-zinc-400 hover:text-zinc-700">
              전체 보기 →
            </Link>
          </div>
          {recentProducts.length === 0 ? (
            <div className="bg-white border border-gray-200 p-6 text-center text-xs text-zinc-400">
              등록된 상품이 없습니다
            </div>
          ) : (
            <div className="bg-white border border-gray-200 flex flex-col divide-y divide-gray-100">
              {recentProducts.map((p) => (
                <Link
                  key={p.productId}
                  href={`/seller/products/${p.productId}/edit`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.productName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-300 text-lg">·</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.productName}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {p.companyName} · {p.price?.toLocaleString()}원
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0">{p.category}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
