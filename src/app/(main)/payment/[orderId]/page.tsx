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

  const currentStep = status === "idle" || status === "error" ? 0 : status === "preparing" ? 1 : status === "paying" ? 1 : 2;

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
        orderName: order.items?.[0]?.productSnapshot?.productName ?? "Rush Deal 주문",
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

  if (isLoading) return <div className="max-w-md mx-auto h-64 bg-gray-100 rounded-2xl animate-pulse" />;

  if (!order) return <div className="text-center py-20 text-gray-400">주문을 찾을 수 없습니다</div>;

  if (order.status !== "PENDING_PAYMENT") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-gray-400 mb-4">결제할 수 없는 주문입니다.</p>
        <button onClick={() => router.push(`/orders/${orderId}`)} className="text-sky-500 font-medium hover:underline">
          주문 상세 보기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 돌아가기
      </button>
      <h1 className="text-2xl font-bold mb-6">결제하기</h1>

      {/* 단계 표시 */}
      <div className="flex items-center mb-6">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= currentStep ? "bg-sky-500 text-white" : "bg-gray-200 text-gray-400"
              }`}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i <= currentStep ? "text-sky-500 font-medium" : "text-gray-400"}`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${i < currentStep ? "bg-sky-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
        {/* 주문 상품 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">주문 상품</p>
          <div className="flex flex-col gap-2">
            {order.items?.map((item: any) => (
              <div key={item.orderItemId} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.productSnapshot?.productName}
                  <span className="text-gray-400 ml-1">× {item.quantity}</span>
                </span>
                <span className="font-medium">{item.subtotal?.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>

        {/* 금액 상세 */}
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
            <span className="text-sky-500">{order.finalAmount?.toLocaleString()}원</span>
          </div>
        </div>

        {/* 배송지 */}
        {order.shippingInfo && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">배송지</p>
            <div className="text-sm text-gray-600 flex flex-col gap-0.5">
              <p>{order.shippingInfo.recipientName} · {order.shippingInfo.recipientPhone}</p>
              <p>{order.shippingInfo.address}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={status === "preparing" || status === "paying"}
          className="w-full py-3.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50 text-base"
        >
          {status === "preparing" && "결제 준비 중..."}
          {status === "paying" && "결제창 진행 중..."}
          {(status === "idle" || status === "error") && `${order.finalAmount?.toLocaleString()}원 결제하기`}
        </button>

        <p className="text-xs text-gray-400 text-center">PortOne을 통해 안전하게 결제됩니다</p>
      </div>
    </div>
  );
}
