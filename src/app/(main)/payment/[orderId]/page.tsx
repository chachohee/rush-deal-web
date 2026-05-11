"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as PortOne from "@portone/browser-sdk/v2";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/Toast";

const STEPS = ["주문 확인", "결제 진행", "완료"];

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "preparing" | "paying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const currentStep = status === "idle" || status === "error" ? 0 : 1;

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const { data: res, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const r = await api.get(`/api/v1/orders/${orderId}`);
      return r.data;
    },
    enabled: !!orderId && !!user,
  });

  const order = res?.data;

  const handlePay = async () => {
    if (!order) return;
    setStatus("preparing");
    setErrorMsg("");

    try {
      const prepareRes = await api.post("/api/v1/payments", {
        orderId: order.orderId,
        totalAmount: order.finalAmount,
      });
      const prepared = prepareRes.data?.data ?? prepareRes.data;
      const portOnePaymentId: string = prepared.portOnePaymentId;

      setStatus("paying");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payResult = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: portOnePaymentId,
        orderName: order.orderItems?.[0]?.productSnapshot?.productName ?? "Rush Deal 주문",
        totalAmount: order.finalAmount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          fullName: user?.name ?? "",
        },
      } as any);

      if (payResult?.code) {
        setStatus("error");
        setErrorMsg(payResult.message ?? "결제가 취소됐습니다.");
        return;
      }

      await api.post("/api/v1/payments/complete", { portOnePaymentId });

      toast("결제가 완료되었습니다", "success");
      router.push(`/orders/${orderId}`);
    } catch {
      setStatus("error");
      setErrorMsg("결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      toast("결제에 실패했습니다", "error");
    }
  };

  if (isLoading) return <div className="max-w-md mx-auto h-64 bg-gray-100 animate-pulse" />;

  if (!order) return <div className="text-center py-20 text-zinc-400 text-sm">주문을 찾을 수 없습니다</div>;

  if (order.orderStatus !== "PENDING_PAYMENT") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-zinc-400 text-sm mb-4">결제할 수 없는 주문입니다.</p>
        <button onClick={() => router.push(`/orders/${orderId}`)} className="text-sm font-medium hover:text-blue-600 transition-colors">
          주문 상세 보기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-700 mb-6 tracking-wide transition-colors">
        ← 돌아가기
      </button>

      {/* 단계 표시 */}
      <div className="flex items-center mb-8">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors ${
                i <= currentStep ? "bg-gray-900 text-white" : "bg-gray-200 text-zinc-400"
              }`}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i <= currentStep ? "text-gray-900 font-medium" : "text-zinc-400"}`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 transition-colors ${i < currentStep ? "bg-gray-900" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 flex flex-col gap-0">
        {/* 주문 상품 */}
        <div className="p-6 border-b border-gray-100">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">주문 상품</p>
          <div className="flex flex-col gap-2">
            {order.orderItems?.map((item: any) => (
              <div key={item.orderItemId} className="flex justify-between text-sm">
                <span className="text-zinc-700">
                  {item.productName}
                  <span className="text-zinc-400 ml-1">× {item.quantity}</span>
                </span>
                <span className="font-medium tabular-nums">{item.subtotal?.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>

        {/* 금액 상세 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col gap-1.5">
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
            <span className="tabular-nums text-blue-600">{order.finalAmount?.toLocaleString()}원</span>
          </div>
        </div>

        {/* 배송지 */}
        {order.shippingInfo && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">배송지</p>
            <p className="text-sm text-zinc-700">{order.shippingInfo.recipientName} · {order.shippingInfo.recipientPhone}</p>
            <p className="text-sm text-zinc-500">
              {order.shippingInfo.addressBase ?? order.shippingInfo.address}
              {order.shippingInfo.addressDetail ? ` ${order.shippingInfo.addressDetail}` : ""}
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 my-4 px-4 py-3 border border-red-200 bg-red-50 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="p-6">
          <button
            onClick={handlePay}
            disabled={status === "preparing" || status === "paying"}
            className="w-full py-3.5 bg-gray-900 text-white font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40 text-sm"
          >
            {status === "preparing" && "결제 준비 중..."}
            {status === "paying" && "결제창 진행 중..."}
            {(status === "idle" || status === "error") && `${order.finalAmount?.toLocaleString()}원 결제하기`}
          </button>
          <p className="text-xs text-zinc-400 text-center mt-3">PortOne을 통해 안전하게 결제됩니다</p>
        </div>
      </div>
    </div>
  );
}
