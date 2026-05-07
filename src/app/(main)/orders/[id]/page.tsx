"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "주문접수", PENDING_PAYMENT: "결제대기", PAID: "결제완료",
  PURCHASE_CONFIRMED: "구매확정", CANCELLED: "취소됨", REFUNDED: "환불됨",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const r = await api.get(`/api/v1/orders/${id}`);
      return r.data;
    },
  });

  const order = res?.data;

  const cancelOrder = useMutation({
    mutationFn: () => api.post(`/api/v1/orders/${id}/cancel`, { reason: "사용자 취소" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order", id] }),
  });

  const confirmPurchase = useMutation({
    mutationFn: () => api.post(`/api/v1/orders/${id}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order", id] }),
  });

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />;
  if (!order) return <div className="text-center py-20 text-gray-400">주문을 찾을 수 없습니다</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 목록으로
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">주문 상세</h1>
          <span className="text-sm font-semibold text-orange-500">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <div className="text-xs text-gray-400">
          주문번호: {order.orderId}
        </div>

        <div className="flex flex-col gap-3">
          {order.items?.map((item: any) => (
            <div key={item.orderItemId} className="flex justify-between items-start py-3 border-t border-gray-50">
              <div>
                <p className="font-medium">{item.productSnapshot?.productName}</p>
                <p className="text-sm text-gray-400 mt-0.5">{item.quantity}개</p>
              </div>
              <p className="font-semibold">{item.subtotal?.toLocaleString()}원</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>상품 금액</span>
            <span>{order.totalAmount?.toLocaleString()}원</span>
          </div>
          {order.pointUsed > 0 && (
            <div className="flex justify-between text-blue-500">
              <span>포인트 사용</span>
              <span>-{order.pointUsed?.toLocaleString()}P</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base mt-1">
            <span>최종 결제금액</span>
            <span className="text-orange-500">{order.finalAmount?.toLocaleString()}원</span>
          </div>
        </div>

        {order.shippingInfo && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium mb-1">배송지</p>
            <p>{order.shippingInfo.recipientName} · {order.shippingInfo.recipientPhone}</p>
            <p>{order.shippingInfo.address}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {(order.status === "PENDING" || order.status === "PENDING_PAYMENT") && (
            <button
              onClick={() => cancelOrder.mutate()}
              disabled={cancelOrder.isPending}
              className="flex-1 py-2.5 border border-red-300 text-red-500 rounded-xl font-medium hover:bg-red-50 transition disabled:opacity-50"
            >
              주문 취소
            </button>
          )}
          {order.status === "PAID" && (
            <button
              onClick={() => confirmPurchase.mutate()}
              disabled={confirmPurchase.isPending}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              구매 확정
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
