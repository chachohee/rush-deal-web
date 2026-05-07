import Link from "next/link";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  ACTIVE:    { label: "진행중",   className: "bg-orange-500 text-white" },
  SCHEDULED: { label: "진행예정", className: "bg-blue-500 text-white" },
  SOLD_OUT:  { label: "품절",     className: "bg-gray-400 text-white" },
  ENDED:     { label: "마감",     className: "bg-gray-300 text-gray-600" },
};

interface Props {
  deal: {
    id: string;
    title: string;
    description: string;
    discountPrice: number;
    status: string;
    startAt: string;
    endAt: string;
  };
}

export default function TimeDealCard({ deal }: Props) {
  const status = STATUS_STYLE[deal.status] ?? { label: deal.status, className: "bg-gray-200" };
  const isClickable = deal.status === "ACTIVE" || deal.status === "SCHEDULED";

  const card = (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 transition ${
        isClickable ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : "opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
          {status.label}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(deal.endAt).toLocaleDateString("ko-KR", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })} 마감
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 line-clamp-1">{deal.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{deal.description}</p>
      </div>

      <div className="mt-auto pt-2 border-t border-gray-50">
        <span className="text-xl font-bold text-orange-500">
          {deal.discountPrice.toLocaleString()}원
        </span>
      </div>
    </div>
  );

  return isClickable ? <Link href={`/timedeals/${deal.id}`}>{card}</Link> : card;
}
