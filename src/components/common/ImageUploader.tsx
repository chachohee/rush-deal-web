"use client";

import { useRef, useState } from "react";
import api from "@/lib/axios";

interface Props {
  value?: string | null;
  onChange: (url: string) => void;
  className?: string;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ImageUploader({ value, onChange, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("jpeg, png, webp, gif 형식만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("이미지는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ imageUrl: string }>("/api/v1/products/images", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.imageUrl);
    } catch {
      setError("업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const onClickArea = () => inputRef.current?.click();

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="relative w-full aspect-square bg-gray-50 overflow-hidden border border-gray-200">
          <img src={value} alt="상품 이미지" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={onClickArea}
              disabled={uploading}
              className="px-2.5 py-1 bg-white/95 border border-gray-300 text-xs hover:bg-white disabled:opacity-50"
            >
              변경
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-2.5 py-1 bg-white/95 border border-gray-300 text-xs hover:bg-white"
            >
              제거
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onClickArea}
          disabled={uploading}
          className="w-full aspect-square border-2 border-dashed border-gray-300 hover:border-gray-900 transition-colors flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-700 bg-white disabled:opacity-50"
        >
          <span className="text-3xl">+</span>
          <span className="text-xs tracking-wide">
            {uploading ? "업로드 중..." : "이미지 추가"}
          </span>
          <span className="text-[10px] text-zinc-400">jpeg/png/webp/gif · 5MB 이하</span>
        </button>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
