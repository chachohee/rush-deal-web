"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useCountdown } from "@/hooks/useCountdown";
import { useToast } from "@/components/ui/Toast";
import InterestToggle from "@/components/timedeal/InterestToggle";

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
  const [step, setStep] = useState<"detail" | "queue" | "ordered">("detail");
  const [pointInput, setPointInput] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  // TimeDealDetailResponse: { timeDeal: { id, timeDealInfo:{title,description}, price:{amount}, limitQuantity:{quantity}, period:{startAt,endAt}, status }, timeDealProdutResultList: [{id, productId, productOptionId, timeDealProductStatus}] }
  const { data: dealData, isLoading } = useQuery({
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

  const { data: pointData } = useQuery({
    queryKey: ["point-balance"],
    queryFn: async () => {
      const res = await api.get("/api/v1/points/balance");
      return res.data;
    },
    enabled: !!user,
  });

  // 중첩 구조에서 필드 추출
  const timeDeal = dealData?.timeDeal;
  const productList: any[] = dealData?.timeDealProdutResultList ?? [];
  const firstProduct = productList[0];

  const title: string = timeDeal?.timeDealInfo?.title ?? "";
  const description: string = timeDeal?.timeDealInfo?.description ?? "";
  const discountPrice: number = timeDeal?.price?.amount ?? 0;
  const limitQty: number = timeDeal?.limitQuantity?.quantity ?? 1;
  const endAt: string = timeDeal?.period?.endAt ?? new Date(Date.now() + 86400000).toISOString();
  const startAt: string = timeDeal?.period?.startAt ?? "";
  const status: string = timeDeal?.status ?? "";

  // 큐 진입 및 주문 생성에 필요한 ID
  const productId: string = firstProduct?.productId?.toString() ?? "";
  const timeDealStockId: string = firstProduct?.id?.toString() ?? "";

  const isActive = status === "IN_PROGRESS";
  const isSoldOut = status === "SOLD_OUT";

  const pointBalance: number = pointData?.balance ?? pointData?.data?.balance ?? 0;
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  const countdown = useCountdown(endAt);

  const totalPrice: number = discountPrice * quantity;
  const pointUsed = Math.min(
    Math.max(0, parseInt(pointInput || "0", 10) || 0),
    pointBalance,
    totalPrice
  );
  const finalAmount = Math.max(0, totalPrice - pointUsed);

  const enterQueue = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/queues/enter", { productId });
      return res.data;
    },
    onSuccess: (data) => {
      setQueueToken(data.data?.tokenId ?? data.tokenId);
      setStep("queue");
      toast("대기열에 진입했습니다", "success");
    },
    onError: () => toast("대기열 진입에 실패했습니다", "error"),
  });

  // 3초마다 순위 자동 조회
  const { data: rankData } = useQuery({
    queryKey: ["queue-rank", id, queueToken],
    queryFn: async () => {
      const res = await api.get(`/api/v1/queues/rank?productId=${productId}`, {
        headers: { "X-Queue-Token": queueToken },
      });
      return res.data;
    },
    enabled: step === "queue" && !!queueToken && !!productId,
    refetchInterval: (query) => {
      if (query.state.data?.data?.status === "ACTIVE") return false;
      return 3000;
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        "/api/v1/orders",
        {
          timeDealId: id,
          productId,
          orderItems: [{ timeDealStockId, quantity }],
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
    onSuccess: () => {
      setStep("ordered");
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

  if (!timeDeal) return <div className="text-center py-20 text-zinc-400 text-sm">타임딜을 찾을 수 없습니다</div>;

  const pad = (n: number) => String(n).padStart(2, "0");
  const canOrder = rankData?.data?.status === "ACTIVE";

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-xs text-zinc-400 hover:text-zinc-700 mb-6 tracking-wide transition-colors"
      >
        ← 목록으로
      </button>

      <div className="bg-white border border-gray-200">
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          <span className="text-6xl select-none">⏰</span>
        </div>

        <div className="p-6">
          {/* 상태 + 타이머 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-blue-500" : "bg-zinc-300"}`} />
              <span className="text-xs text-zinc-500 font-medium">
                {isActive ? "진행중" : status === "SCHEDULED" ? "진행예정" : isSoldOut ? "품절" : "종료"}
              </span>
            </div>
            {isActive && !countdown.done ? (
              <span className="text-sm font-mono font-bold text-blue-600 tabular-nums">
                {countdown.hours > 0 ? `${pad(countdown.hours)}:` : ""}
                {pad(countdown.minutes)}:{pad(countdown.seconds)}
              </span>
            ) : (
              <span className="text-xs text-zinc-400">
                {new Date(endAt).toLocaleString("ko-KR")} 마감
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <InterestToggle timeDealId={id} size="md" />
          </div>
          <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{description}</p>

          <div className="flex items-baseline gap-3 pb-6 border-b border-gray-100">
            <span className="text-3xl font-bold tracking-tight">
              {discountPrice.toLocaleString()}
              <span className="text-lg font-normal text-zinc-400 ml-0.5">원</span>
            </span>
            <span className="text-xs text-zinc-400">1인 최대 {limitQty}개</span>
          </div>

          <div className="pt-6 flex flex-col gap-3">
            {/* 배송지 없음 경고 */}
            {step === "detail" && isActive && !isSoldOut && !defaultAddress && user && (
              <div className="px-4 py-3 border-l-2 border-amber-400 bg-amber-50 text-xs text-amber-700 flex items-center justify-between">
                <span>기본 배송지가 없습니다</span>
                <button onClick={() => router.push("/mypage")} className="font-semibold underline">
                  등록하기
                </button>
              </div>
            )}

            {/* 대기열 진입 버튼 */}
            {step === "detail" && isActive && !isSoldOut && (
              <button
                onClick={() => {
                  if (!user) { router.push("/login"); return; }
                  enterQueue.mutate();
                }}
                disabled={enterQueue.isPending || !productId}
                className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold tracking-wide hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {enterQueue.isPending ? "진입 중..." : "대기열 진입"}
              </button>
            )}

            {/* 대기열 진입 후 */}
            {step === "queue" && (
              <div className="flex flex-col gap-3">
                {/* 순위 표시 */}
                <div className="border border-gray-200 p-4 text-center">
                  {canOrder ? (
                    <p className="font-bold text-blue-600 text-sm">활성화 — 지금 바로 주문 가능합니다</p>
                  ) : rankData?.data?.rank != null ? (
                    <>
                      <p className="text-xs text-zinc-400 mb-1">현재 대기 순위</p>
                      <p className="text-2xl font-bold text-gray-900">
                        <span className="text-blue-600">{rankData.data.rank}</span>
                        <span className="text-sm font-normal text-zinc-400 ml-1">번</span>
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">순위는 자동으로 업데이트됩니다</p>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400">대기 순위 조회 중...</p>
                  )}
                </div>

                {/* 배송지 */}
                {defaultAddress && (
                  <div className="bg-gray-50 px-4 py-3 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">배송지 </span>
                    {defaultAddress.addressBase} {defaultAddress.addressDetail}
                  </div>
                )}

                {/* 활성화 시 주문 섹션 */}
                {canOrder && (
                  <>
                    {/* 수량 선택 */}
                    <div className="border border-gray-200 p-4 flex items-center justify-between">
                      <span className="text-sm font-medium">수량</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors text-lg leading-none"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => Math.min(limitQty, q + 1))}
                          className="w-8 h-8 border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 포인트 사용 */}
                    <div className="border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">포인트 사용</span>
                        <span className="text-xs text-zinc-400">
                          보유 <span className="font-semibold text-zinc-700">{pointBalance.toLocaleString()}</span>P
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={Math.min(pointBalance, totalPrice)}
                          value={pointInput}
                          onChange={(e) => setPointInput(e.target.value)}
                          placeholder="0"
                          className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                        />
                        <button
                          onClick={() => setPointInput(String(Math.min(pointBalance, totalPrice)))}
                          className="px-3 py-2 text-xs font-medium border border-gray-300 hover:border-gray-900 transition-colors whitespace-nowrap"
                        >
                          전액
                        </button>
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-zinc-400">
                        <span>포인트 -{pointUsed.toLocaleString()}P</span>
                        <span>
                          결제{" "}
                          <span className="font-semibold text-gray-900">{finalAmount.toLocaleString()}원</span>
                        </span>
                      </div>
                    </div>

                    {/* 주문 버튼 */}
                    <button
                      onClick={() => createOrder.mutate()}
                      disabled={createOrder.isPending || !timeDealStockId}
                      className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                      {createOrder.isPending
                        ? "처리 중..."
                        : `${finalAmount.toLocaleString()}원 주문 (${quantity}개)`}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 주문 접수 완료 */}
            {step === "ordered" && (
              <div className="flex flex-col gap-3 text-center py-4">
                <p className="text-sm font-semibold text-gray-900">주문이 접수되었습니다</p>
                <p className="text-xs text-zinc-400">처리 완료까지 잠시 시간이 걸릴 수 있습니다.</p>
                <button
                  onClick={() => router.push("/orders")}
                  className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  주문 내역 보기
                </button>
              </div>
            )}

            {/* 비활성 상태 */}
            {!isActive && (
              <div className="py-3 text-center text-sm text-zinc-400 bg-gray-50">
                {status === "SCHEDULED" ? `${new Date(startAt).toLocaleString("ko-KR")} 시작 예정` : isSoldOut ? "품절된 타임딜입니다" : "종료된 타임딜입니다"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
