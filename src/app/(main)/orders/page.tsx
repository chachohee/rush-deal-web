"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

const STATUS: Record<string, { label: string; dot: string }> = {
  PENDING:            { label: "주문접수", dot: "bg-zinc-400" },
  PENDING_PAYMENT:    { label: "결제대기", dot: "bg-blue-500" },
  PAID:               { label: "결제완료", dot: "bg-green-500" },
  PURCHASE_CONFIRMED: { label: "구매확정", dot: "bg-zinc-300" },
  CANCELLED:          { label: "취소됨",   dot: "bg-red-400" },
  REFUNDED:           { label: "환불됨",   dot: "bg-purple-400" },
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => { if (!user) router.replace("/login"); }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await api.get("/api/v1/orders?size=20&sort=orderedAt,desc");
      return res.data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-px bg-gray-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const orders = data?.data?.content ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-8">주문 내역</h1>

      {orders.length === 0 ? (
        <div className="text-center py-24 text-zinc-400 text-sm">
          <p className="mb-4">주문 내역이 없습니다</p>
          <Link href="/timedeals" className="text-blue-600 font-medium hover:underline">
            타임딜 보러가기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-px bg-gray-200">
          {orders.map((order: any) => {
            const s = STATUS[order.orderStatus] ?? { label: order.orderStatus, dot: "bg-zinc-300" };
            const itemName = order.firstProductName ?? "상품";
            const extraCount = (order.itemCount ?? 1) - 1;
            const orderedAt = new Date(order.orderedAt);

            return (
              <div key={order.orderId} className="bg-white">
                <Link href={`/orders/${order.orderId}`} className="flex items-start justify-between gap-4 p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-400 mb-1.5 tabular-nums">
                      {orderedAt.toLocaleDateString("ko-KR")} {orderedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-sm font-semibold truncate">
                      {itemName}{extraCount > 0 && <span className="text-zinc-400 font-normal"> 외 {extraCount}건</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold">{order.finalAmount?.toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className="text-xs text-zinc-500">{s.label}</span>
                  </div>
                </Link>

                {order.orderStatus === "PENDING_PAYMENT" && (
                  <div className="px-5 pb-4">
                    <button
                      onClick={() => router.push(`/payment/${order.orderId}`)}
                      className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                    >
                      결제하기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
