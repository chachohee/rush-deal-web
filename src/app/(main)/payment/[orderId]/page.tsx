"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as PortOne from "@portone/browser-sdk/v2";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<"idle" | "preparing" | "paying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
      // 1. 결제 준비 (paymentId 발급)
      const prepareRes = await api.post("/api/v1/payments", {
        orderId: order.orderId,
        totalAmount: order.finalAmount,
      });
      const prepared = prepareRes.data?.data ?? prepareRes.data;
      const portOnePaymentId: string = prepared.portOnePaymentId;

      setStatus("paying");

      // 2. PortOne 결제창 호출
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
        // 결제 실패 or 사용자 취소
        setStatus("error");
        setErrorMsg(payResult.message ?? "결제가 취소됐습니다.");
        return;
      }

      // 3. 결제 완료 처리
      await api.post("/api/v1/payments/complete", {
        portOnePaymentId,
      });

      router.push(`/orders/${orderId}`);
    } catch {
      setStatus("error");
      setErrorMsg("결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />;

  if (!order) return <div className="text-center py-20 text-gray-400">주문을 찾을 수 없습니다</div>;

  if (order.status !== "PENDING_PAYMENT") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-gray-400 mb-4">결제할 수 없는 주문입니다.</p>
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="text-sky-500 font-medium hover:underline"
        >
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
        {/* 주문 요약 */}
        <div>
          <p className="text-sm text-gray-400 mb-3">주문 내역</p>
          <div className="flex flex-col gap-2">
            {order.items?.map((item: any) => (
              <div key={item.orderItemId} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.productSnapshot?.productName} × {item.quantity}
                </span>
                <span className="font-medium">{item.subtotal?.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 flex flex-col gap-1.5 text-sm">
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

        {errorMsg && (
          <p className="text-sm text-red-500 text-center">{errorMsg}</p>
        )}

        <button
          onClick={handlePay}
          disabled={status === "preparing" || status === "paying"}
          className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50"
        >
          {status === "preparing" && "결제 준비 중..."}
          {status === "paying" && "결제창 진행 중..."}
          {(status === "idle" || status === "error") && `${order.finalAmount?.toLocaleString()}원 결제하기`}
        </button>

        <p className="text-xs text-gray-400 text-center">
          PortOne을 통해 안전하게 결제됩니다
        </p>
      </div>
    </div>
  );
}
