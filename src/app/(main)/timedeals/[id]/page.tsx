"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

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

  const { data: deal, isLoading } = useQuery({
    queryKey: ["timedeal", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/timedeals/${id}`);
      return res.data;
    },
  });

  // 기본 배송지 조회
  const { data: addresses = [] } = useQuery<ShippingAddress[]>({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/me/addresses");
      return res.data;
    },
    enabled: !!user,
  });

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  // 대기열 진입
  const enterQueue = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/queues/enter", { productId: deal.productId });
      return res.data;
    },
    onSuccess: (data) => {
      setQueueToken(data.data?.tokenId);
      setStep("queue");
    },
  });

  // 대기 순위 조회
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

  // 주문 생성
  const createOrder = useMutation({
    mutationFn: async (quantity: number) => {
      const timeDealForOrder = await api.get(`/api/v1/timedeals/${id}/order`);
      const stockId = timeDealForOrder.data.products?.[0]?.timeDealStockId;
      const res = await api.post(
        "/api/v1/orders",
        {
          items: [{ timeDealStockId: stockId, quantity }],
          pointUsed: 0,
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
      router.push(`/orders/${data.data?.orderId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!deal) return <div className="text-center py-20 text-gray-400">타임딜을 찾을 수 없습니다</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
        ← 목록으로
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            deal.status === "ACTIVE" ? "bg-sky-500 text-white" : "bg-gray-200 text-gray-600"
          }`}>
            {deal.status === "ACTIVE" ? "진행중" : deal.status}
          </span>
          <span className="text-sm text-gray-400">
            {new Date(deal.endAt).toLocaleString("ko-KR")} 마감
          </span>
        </div>

        <h1 className="text-2xl font-bold mb-2">{deal.title}</h1>
        <p className="text-gray-500 mb-6">{deal.description}</p>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-bold text-sky-500">
            {deal.discountPrice?.toLocaleString()}원
          </span>
          <span className="text-sm text-gray-400">1인 최대 {deal.limitQuantity}개</span>
        </div>

        {/* 배송지 미등록 안내 */}
        {step === "detail" && deal.status === "ACTIVE" && !defaultAddress && user && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center justify-between">
            <span>기본 배송지가 없어요</span>
            <button onClick={() => router.push("/mypage")} className="font-semibold underline">
              배송지 등록
            </button>
          </div>
        )}

        {step === "detail" && deal.status === "ACTIVE" && (
          <button
            onClick={() => {
              if (!user) { router.push("/login"); return; }
              enterQueue.mutate();
            }}
            disabled={enterQueue.isPending}
            className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50"
          >
            {enterQueue.isPending ? "대기열 진입 중..." : "대기열 진입하기"}
          </button>
        )}

        {step === "queue" && (
          <div className="flex flex-col gap-3">
            <div className="bg-sky-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">대기열 진입 완료</p>
              {rankData?.data?.status === "ACTIVE" ? (
                <p className="font-bold text-green-600">활성화됨 — 바로 주문할 수 있어요!</p>
              ) : (
                <p className="font-bold text-sky-500">
                  대기 순위: {rankData?.data?.rank ?? "—"}번
                </p>
              )}
            </div>
            {defaultAddress && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
                <span className="font-medium text-gray-700">배송지: </span>
                {defaultAddress.addressBase} {defaultAddress.addressDetail}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => checkRank()}
                className="flex-1 py-2.5 border border-sky-400 text-sky-500 rounded-xl font-medium hover:bg-sky-50 transition"
              >
                순위 확인
              </button>
              {rankData?.data?.status === "ACTIVE" && (
                <button
                  onClick={() => createOrder.mutate(1)}
                  disabled={createOrder.isPending}
                  className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {createOrder.isPending ? "주문 중..." : "주문하기 (1개)"}
                </button>
              )}
            </div>
          </div>
        )}

        {deal.status !== "ACTIVE" && (
          <div className="w-full py-3 bg-gray-100 text-gray-400 rounded-xl text-center font-medium">
            {deal.status === "SCHEDULED" ? "아직 시작 전이에요" : "종료된 타임딜이에요"}
          </div>
        )}
      </div>
    </div>
  );
}
