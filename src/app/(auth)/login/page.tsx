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

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post("/api/v1/auth/login", data);
      const { accessToken } = res.data as { accessToken: string };

      // Save token so the /me request gets the Authorization header
      localStorage.setItem("accessToken", accessToken);

      // JWT payload: { sub: userId, email, role, ... }
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
    <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">⏰ Rush Deal</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              {...register("email")}
              type="email"
              placeholder="example@email.com"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              {...register("password")}
              type="password"
              placeholder="비밀번호"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sky-500 text-white py-2 rounded-lg font-semibold hover:bg-sky-600 transition disabled:opacity-50"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-sky-500 font-medium hover:underline">
            회원가입
          </Link>
        </p>
    </div>
  );
}
