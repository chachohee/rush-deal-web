"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type FormData = z.infer<typeof schema>;

const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post("/api/v1/auth/login", data);
      const { accessToken } = res.data as { accessToken: string };
      localStorage.setItem("accessToken", accessToken);
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const role: string = payload.role ?? "";
      const meRes = await api.get("/api/v1/users/me");
      const { userId, email, name } = meRes.data.data ?? meRes.data;
      setAuth(accessToken, { userId, email, name, role });
      router.push("/timedeals");
    } catch {
      localStorage.removeItem("accessToken");
      setError("root", { message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black tracking-[0.1em]">
          RUSH<span className="text-blue-600 ml-1">DEAL</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">한정 시간, 최고의 가격</p>
      </div>

      <div className="border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">이메일</label>
            <input {...register("email")} type="email" placeholder="example@email.com" className={inputCls} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">비밀번호</label>
            <input {...register("password")} type="password" placeholder="비밀번호" className={inputCls} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          {errors.root && <p className="text-red-500 text-xs text-center">{errors.root.message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-5">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-gray-900 font-semibold hover:text-blue-600 transition-colors">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
