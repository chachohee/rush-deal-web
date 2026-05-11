"use client";

import Link from "next/link";
import { useCountdown } from "@/hooks/useCountdown";

const STATUS_STYLE: Record<string, { label: string; dot: string }> = {
  ACTIVE:      { label: "진행중",   dot: "bg-blue-500" },
  IN_PROGRESS: { label: "진행중",   dot: "bg-blue-500" },
  SCHEDULED:   { label: "진행예정", dot: "bg-zinc-400" },
  SOLD_OUT:    { label: "품절",     dot: "bg-red-400" },
  ENDED:       { label: "마감",     dot: "bg-zinc-300" },
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown({ targetIso, label }: { targetIso: string; label: string }) {
  const { hours, minutes, seconds, done } = useCountdown(targetIso);
  if (done) return null;
  return (
    <span className="font-mono text-xs tabular-nums text-zinc-400">
      {label} {hours > 0 ? `${pad(hours)}:` : ""}{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

interface Props {
  deal: {
    id?: string;
    timeDealId?: string;
    title: string;
    description: string;
    price?: number;
    discountPrice?: number;
    status: string;
    startAt: string;
    endAt: string;
  };
}

export default function TimeDealCard({ deal }: Props) {
  const dealId = deal.id ?? deal.timeDealId ?? "";
  const status = STATUS_STYLE[deal.status] ?? { label: deal.status, dot: "bg-zinc-300" };
  const isClickable = deal.status === "ACTIVE" || deal.status === "IN_PROGRESS" || deal.status === "SCHEDULED";
  const isEnded = deal.status === "ENDED" || deal.status === "SOLD_OUT";

  const card = (
    <div className={`group bg-white border border-gray-200 flex flex-col transition-all duration-200 ${
      isClickable ? "hover:border-gray-400 cursor-pointer" : "opacity-50"
    }`}>
      {/* 이미지 플레이스홀더 */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
        <span className="text-4xl select-none">⏰</span>
        {isEnded && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">{status.label}</span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span className="text-xs text-zinc-500">{status.label}</span>
          </div>
          {(deal.status === "ACTIVE" || deal.status === "IN_PROGRESS") && <Countdown targetIso={deal.endAt} label="종료" />}
          {deal.status === "SCHEDULED" && <Countdown targetIso={deal.startAt} label="시작" />}
        </div>

        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {deal.title}
        </p>

        <p className="text-base font-bold text-gray-900">
          {(deal.price ?? deal.discountPrice)?.toLocaleString() ?? "0"}
          <span className="text-sm font-normal text-zinc-400 ml-0.5">원</span>
        </p>
      </div>
    </div>
  );

  return isClickable ? <Link href={`/timedeals/${dealId}`}>{card}</Link> : card;
}
