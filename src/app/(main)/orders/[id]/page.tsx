"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useToast } from "@/components/ui/Toast";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "주문접수", PENDING_PAYMENT: "결제대기", PAID: "결제완료",
  PURCHASE_CONFIRMED: "구매확정", CANCELLED: "취소됨", REFUNDED: "환불됨",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast("주문이 취소되었습니다", "success");
    },
    onError: () => toast("주문 취소에 실패했습니다", "error"),
  });

  const confirmPurchase = useMutation({
    mutationFn: () => api.post(`/api/v1/orders/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast("구매가 확정되었습니다", "success");
    },
    onError: () => toast("구매 확정에 실패했습니다", "error"),
  });

  const refundOrder = useMutation({
    mutationFn: () => api.post(`/api/v1/orders/${id}/refund`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast("환불이 요청되었습니다", "success");
    },
    onError: () => toast("환불 요청에 실패했습니다", "error"),
  });

  if (isLoading) return <div className="max-w-2xl mx-auto h-64 bg-gray-100 animate-pulse" />;
  if (!order) return <div className="text-center py-20 text-zinc-400 text-sm">주문을 찾을 수 없습니다</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-700 mb-6 tracking-wide transition-colors">
        ← 목록으로
      </button>

      <div className="bg-white border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h1 className="text-base font-bold tracking-tight">주문 상세</h1>
          <span className="text-xs font-medium text-zinc-500">{STATUS_LABEL[order.orderStatus] ?? order.orderStatus}</span>
        </div>

        <div className="px-6 py-3 border-b border-gray-100">
          <p className="text-xs text-zinc-400 font-mono">{order.orderId}</p>
        </div>

        <div className="px-6">
          {order.orderItems?.map((item: any) => (
            <div key={item.orderItemId} className="flex justify-between items-start py-4 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.quantity}개</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{item.subtotal?.toLocaleString()}원</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>상품 금액</span>
            <span className="tabular-nums">{order.totalAmount?.toLocaleString()}원</span>
          </div>
          {order.pointUsed > 0 && (
            <div className="flex justify-between text-xs text-zinc-500">
              <span>포인트 사용</span>
              <span className="tabular-nums">-{order.pointUsed?.toLocaleString()}P</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200 mt-1">
            <span>최종 결제금액</span>
            <span className="tabular-nums">{order.finalAmount?.toLocaleString()}원</span>
          </div>
        </div>

        {order.shippingInfo && (
          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">배송지</p>
            <p className="text-sm text-zinc-700">{order.shippingInfo.recipientName} · {order.shippingInfo.recipientPhone}</p>
            <p className="text-sm text-zinc-500">
              {order.shippingInfo.addressBase ?? order.shippingInfo.address}
              {order.shippingInfo.addressDetail ? ` ${order.shippingInfo.addressDetail}` : ""}
            </p>
          </div>
        )}

        {(order.orderStatus === "PENDING" || order.orderStatus === "PENDING_PAYMENT" || order.orderStatus === "PAID" || order.orderStatus === "PURCHASE_CONFIRMED") && (
          <div className="flex gap-2 p-6 border-t border-gray-200">
            {(order.orderStatus === "PENDING" || order.orderStatus === "PENDING_PAYMENT") && (
              <button
                onClick={() => cancelOrder.mutate()}
                disabled={cancelOrder.isPending}
                className="flex-1 py-3 border border-gray-300 text-sm font-medium text-zinc-600 hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-40"
              >
                {cancelOrder.isPending ? "취소 중..." : "주문 취소"}
              </button>
            )}
            {order.orderStatus === "PENDING_PAYMENT" && (
              <button
                onClick={() => router.push(`/payment/${order.orderId}`)}
                className="flex-1 py-3 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                결제하기
              </button>
            )}
            {order.orderStatus === "PAID" && (
              <button
                onClick={() => confirmPurchase.mutate()}
                disabled={confirmPurchase.isPending}
                className="flex-1 py-3 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {confirmPurchase.isPending ? "처리 중..." : "구매 확정"}
              </button>
            )}
            {order.orderStatus === "PURCHASE_CONFIRMED" && (
              <button
                onClick={() => {
                  if (confirm("환불을 요청하시겠습니까?")) refundOrder.mutate();
                }}
                disabled={refundOrder.isPending}
                className="flex-1 py-3 border border-gray-300 text-sm font-medium text-zinc-600 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                {refundOrder.isPending ? "처리 중..." : "환불 요청"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
