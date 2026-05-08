"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING:            { label: "주문접수",   className: "text-yellow-600 bg-yellow-50" },
  PENDING_PAYMENT:    { label: "결제대기",   className: "text-blue-600 bg-blue-50" },
  PAID:               { label: "결제완료",   className: "text-green-600 bg-green-50" },
  PURCHASE_CONFIRMED: { label: "구매확정",   className: "text-gray-600 bg-gray-100" },
  CANCELLED:          { label: "취소됨",     className: "text-red-500 bg-red-50" },
  REFUNDED:           { label: "환불됨",     className: "text-purple-600 bg-purple-50" },
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

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
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const orders = data?.data?.content ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">내 주문</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🛒</p>
          <p className="mb-4">주문 내역이 없어요</p>
          <Link href="/timedeals" className="text-sky-500 font-medium hover:underline">
            타임딜 보러가기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order: any) => {
            const status = STATUS_LABEL[order.status] ?? { label: order.status, className: "text-gray-500 bg-gray-100" };
            const itemName = order.items?.[0]?.productSnapshot?.productName ?? "상품";
            const extraCount = (order.items?.length ?? 1) - 1;
            const orderedAt = new Date(order.orderedAt);

            return (
              <div
                key={order.orderId}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition"
              >
                <Link href={`/orders/${order.orderId}`} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-1">
                      {orderedAt.toLocaleDateString("ko-KR")} {orderedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="font-semibold truncate">
                      {itemName}{extraCount > 0 && <span className="text-gray-400 font-normal"> 외 {extraCount}건</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sky-500 font-bold">{order.finalAmount?.toLocaleString()}원</p>
                      {order.pointUsed > 0 && (
                        <span className="text-xs text-blue-400">포인트 {order.pointUsed?.toLocaleString()}P 사용</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                </Link>

                {order.status === "PENDING_PAYMENT" && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/payment/${order.orderId}`)}
                      className="w-full py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition"
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
