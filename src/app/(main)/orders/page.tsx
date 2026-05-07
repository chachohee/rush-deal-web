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
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">내 주문</h1>
      {data?.data?.content?.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">주문 내역이 없어요</p>
          <Link href="/timedeals" className="text-orange-500 font-medium hover:underline">
            타임딜 보러가기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data?.data?.content?.map((order: any) => {
            const status = STATUS_LABEL[order.status] ?? { label: order.status, className: "text-gray-500 bg-gray-100" };
            return (
              <Link
                key={order.orderId}
                href={`/orders/${order.orderId}`}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-gray-400 mb-1">
                    {new Date(order.orderedAt).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="font-medium">
                    {order.items?.[0]?.productSnapshot?.productName ?? "상품"}
                    {order.items?.length > 1 && ` 외 ${order.items.length - 1}건`}
                  </p>
                  <p className="text-orange-500 font-bold mt-1">
                    {order.finalAmount?.toLocaleString()}원
                  </p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.className}`}>
                  {status.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
