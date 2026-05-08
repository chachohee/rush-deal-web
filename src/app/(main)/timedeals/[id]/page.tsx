"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useCountdown } from "@/hooks/useCountdown";
import { useToast } from "@/components/ui/Toast";

interface ShippingAddress {
  addressId: number;
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  addressBase: string;
  addressDetail: string;
  deliveryMessage: string | null;
  isDefault: boolean;
}

export default function TimeDealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [queueToken, setQueueToken] = useState<string | null>(null);
  const [step, setStep] = useState<"detail" | "queue" | "order">("detail");
  const [pointInput, setPointInput] = useState("");
  const { toast } = useToast();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["timedeal", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${id}`);
      return res.data;
    },
  });

  const { data: addresses = [] } = useQuery<ShippingAddress[]>({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/me/addresses");
      return res.data;
    },
    enabled: !!user,
  });

  const { data: pointData } = useQuery<{ balance: number }>({
    queryKey: ["point-balance"],
    queryFn: async () => {
      const res = await api.get("/api/v1/points/balance");
      return res.data;
    },
    enabled: !!user,
  });

  const pointBalance = pointData?.balance ?? 0;
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  const countdown = useCountdown(deal?.endAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString());

  const discountPrice: number = deal?.discountPrice ?? 0;
  const pointUsed = Math.min(
    Math.max(0, parseInt(pointInput || "0", 10) || 0),
    pointBalance,
    discountPrice
  );
  const finalAmount = Math.max(0, discountPrice - pointUsed);

  const enterQueue = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/queues/enter", { productId: deal.productId });
      return res.data;
    },
    onSuccess: (data) => {
      setQueueToken(data.data?.tokenId);
      setStep("queue");
      toast("대기열에 진입했습니다", "success");
    },
    onError: () => toast("대기열 진입에 실패했습니다", "error"),
  });

  const { data: rankData, refetch: checkRank } = useQuery({
    queryKey: ["queue-rank", id, queueToken],
    queryFn: async () => {
      const res = await api.get(`/api/v1/queues/rank?productId=${deal.productId}`, {
        headers: { "X-Queue-Token": queueToken },
      });
      return res.data;
    },
    enabled: false,
  });

  const createOrder = useMutation({
    mutationFn: async (quantity: number) => {
      const timeDealForOrder = await api.get(`/api/v1/timedeals/${id}/order`);
      const stockId = timeDealForOrder.data.products?.[0]?.timeDealStockId;
      const res = await api.post(
        "/api/v1/orders",
        {
          items: [{ timeDealStockId: stockId, quantity }],
          pointUsed,
          shippingInfo: defaultAddress
            ? {
                recipientName: defaultAddress.recipientName,
                recipientPhone: defaultAddress.recipientPhone,
                zipCode: defaultAddress.zipCode,
                addressBase: defaultAddress.addressBase,
                addressDetail: defaultAddress.addressDetail,
                deliveryMessage: defaultAddress.deliveryMessage ?? "",
              }
            : {
                recipientName: user?.name ?? "",
                recipientPhone: "01000000000",
                zipCode: "00000",
                addressBase: "주소 미등록",
                addressDetail: "마이페이지에서 배송지를 등록해주세요",
                deliveryMessage: "",
              },
        },
        { headers: { "X-Queue-Token": queueToken } }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast("주문이 접수되었습니다", "success");
      router.push(`/orders/${data.data?.orderId}`);
    },
    onError: () => toast("주문 생성에 실패했습니다", "error"),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-5 w-32 bg-gray-100 animate-pulse mb-6" />
        <div className="h-80 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!deal) return <div className="text-center py-20 text-zinc-400 text-sm">타임딜을 찾을 수 없습니다</div>;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-700 mb-6 tracking-wide transition-colors">
        ← 목록으로
      </button>

      <div className="bg-white border border-gray-200">
        {/* 이미지 영역 */}
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          <span className="text-6xl select-none">⏰</span>
        </div>

        <div className="p-6">
          {/* 상태 + 타이머 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${deal.status === "ACTIVE" ? "bg-blue-500" : "bg-zinc-300"}`} />
              <span className="text-xs text-zinc-500 font-medium">
                {deal.status === "ACTIVE" ? "진행중" : deal.status === "SCHEDULED" ? "진행예정" : "종료"}
              </span>
            </div>
            {deal.status === "ACTIVE" && !countdown.done ? (
              <span className="text-sm font-mono font-bold text-blue-600 tabular-nums">
                {countdown.hours > 0 ? `${pad(countdown.hours)}:` : ""}
                {pad(countdown.minutes)}:{pad(countdown.seconds)}
              </span>
            ) : (
              <span className="text-xs text-zinc-400">
                {new Date(deal.endAt).toLocaleString("ko-KR")} 마감
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold tracking-tight mb-1">{deal.title}</h1>
          <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{deal.description}</p>

          <div className="flex items-baseline gap-3 pb-6 border-b border-gray-100">
            <span className="text-3xl font-bold tracking-tight">
              {deal.discountPrice?.toLocaleString()}
              <span className="text-lg font-normal text-zinc-400 ml-0.5">원</span>
            </span>
            <span className="text-xs text-zinc-400">1인 최대 {deal.limitQuantity}개</span>
          </div>

          <div className="pt-6 flex flex-col gap-3">
            {step === "detail" && deal.status === "ACTIVE" && !defaultAddress && user && (
              <div className="px-4 py-3 border-l-2 border-amber-400 bg-amber-50 text-xs text-amber-700 flex items-center justify-between">
                <span>기본 배송지가 없습니다</span>
                <button onClick={() => router.push("/mypage")} className="font-semibold underline">등록하기</button>
              </div>
            )}

            {step === "detail" && deal.status === "ACTIVE" && (
              <button
                onClick={() => { if (!user) { router.push("/login"); return; } enterQueue.mutate(); }}
                disabled={enterQueue.isPending}
                className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold tracking-wide hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {enterQueue.isPending ? "진입 중..." : "대기열 진입"}
              </button>
            )}

            {step === "queue" && (
              <div className="flex flex-col gap-3">
                <div className="border border-gray-200 p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-1">대기열 진입 완료</p>
                  {rankData?.data?.status === "ACTIVE" ? (
                    <p className="font-bold text-blue-600">활성화 — 지금 바로 주문 가능합니다</p>
                  ) : (
                    <p className="font-bold text-gray-900">대기 순위 <span className="text-blue-600">{rankData?.data?.rank ?? "—"}</span>번</p>
                  )}
                </div>

                {defaultAddress && (
                  <div className="bg-gray-50 px-4 py-3 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">배송지 </span>
                    {defaultAddress.addressBase} {defaultAddress.addressDetail}
                  </div>
                )}

                {rankData?.data?.status === "ACTIVE" && (
                  <div className="border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">포인트 사용</span>
                      <span className="text-xs text-zinc-400">보유 <span className="font-semibold text-zinc-700">{pointBalance.toLocaleString()}</span>P</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        max={Math.min(pointBalance, discountPrice)}
                        value={pointInput}
                        onChange={(e) => setPointInput(e.target.value)}
                        placeholder="0"
                        className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                      />
                      <button
                        onClick={() => setPointInput(String(Math.min(pointBalance, discountPrice)))}
                        className="px-3 py-2 text-xs font-medium border border-gray-300 hover:border-gray-900 transition-colors whitespace-nowrap"
                      >
                        전액
                      </button>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-zinc-400">
                      <span>포인트 -{pointUsed.toLocaleString()}P</span>
                      <span>결제 <span className="font-semibold text-gray-900">{finalAmount.toLocaleString()}원</span></span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => checkRank()}
                    className="flex-1 py-3 border border-gray-300 text-sm font-medium hover:border-gray-900 transition-colors"
                  >
                    순위 확인
                  </button>
                  {rankData?.data?.status === "ACTIVE" && (
                    <button
                      onClick={() => createOrder.mutate(1)}
                      disabled={createOrder.isPending}
                      className="flex-1 py-3 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                      {createOrder.isPending ? "처리 중..." : `${finalAmount.toLocaleString()}원 주문`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {deal.status !== "ACTIVE" && (
              <div className="py-3 text-center text-sm text-zinc-400 bg-gray-50">
                {deal.status === "SCHEDULED" ? "아직 시작 전입니다" : "종료된 타임딜입니다"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
