"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(8, "비밀번호는 8자 이상").regex(/[!@#$%^&*]/, "특수문자를 포함해야 합니다"),
  name: z.string().min(1, "이름을 입력해주세요"),
  role: z.enum(["USER", "SELLER"]),
});

type FormData = z.infer<typeof schema>;

const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors";
const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

export default function SignupPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: "USER" } });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/api/v1/auth/signup", data);
      router.push("/login");
    } catch {
      setError("root", { message: "회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다" });
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
            <label className={labelCls}>이름</label>
            <input {...register("name")} placeholder="홍길동" className={inputCls} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>이메일</label>
            <input {...register("email")} type="email" placeholder="example@email.com" className={inputCls} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={labelCls}>비밀번호</label>
            <input {...register("password")} type="password" placeholder="8자 이상, 특수문자 포함" className={inputCls} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className={labelCls}>가입 유형</label>
            <select {...register("role")} className={inputCls + " bg-white"}>
              <option value="USER">일반 회원</option>
              <option value="SELLER">판매자</option>
            </select>
          </div>
          {errors.root && <p className="text-red-500 text-xs text-center">{errors.root.message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {isSubmitting ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-5">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-gray-900 font-semibold hover:text-blue-600 transition-colors">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
