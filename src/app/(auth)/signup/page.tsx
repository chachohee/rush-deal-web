"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[!@#$%^&*]/, "특수문자를 포함해야 합니다"),
  name: z.string().min(1, "이름을 입력해주세요"),
  role: z.enum(["USER", "SELLER"]),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "USER" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/api/v1/auth/signup", data);
      router.push("/login");
    } catch {
      setError("root", { message: "회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다" });
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">⏰ 회원가입</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">이름</label>
            <input
              {...register("name")}
              placeholder="홍길동"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
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
              placeholder="8자 이상, 특수문자 포함"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">가입 유형</label>
            <select
              {...register("role")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-gray-300 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white"
            >
              <option value="USER">일반 회원</option>
              <option value="SELLER">판매자</option>
            </select>
          </div>
          {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sky-500 text-white py-2 rounded-lg font-semibold hover:bg-sky-600 transition disabled:opacity-50"
          >
            {isSubmitting ? "가입 중..." : "회원가입"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-sky-500 font-medium hover:underline">
            로그인
          </Link>
        </p>
    </div>
  );
}
