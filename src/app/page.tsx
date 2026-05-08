import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-sky-500 mb-2">⏰ Rush Deal</h1>
        <p className="text-gray-500 text-lg">한정 시간, 최고의 가격으로 만나는 타임딜</p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="px-6 py-3 border border-sky-500 text-sky-500 rounded-lg font-semibold hover:bg-sky-50 transition"
        >
          회원가입
        </Link>
      </div>
    </main>
  );
}
