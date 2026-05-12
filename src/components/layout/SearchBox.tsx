"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import api from "@/lib/axios";

interface Props {
  variant?: "desktop" | "mobile";
}

export default function SearchBox({ variant = "desktop" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerm(pathname === "/search" ? (searchParams.get("q") ?? "") : "");
  }, [pathname, searchParams]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await api.get(`/api/v1/timedeals/search/suggest?q=${encodeURIComponent(q)}&size=8`);
        setSuggestions(Array.isArray(res.data) ? res.data : []);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [term]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      submit(suggestions[activeIdx]);
    }
  };

  const inputCls =
    variant === "desktop"
      ? "w-full text-xs border border-gray-200 px-3 py-2 pr-9 outline-none focus:border-gray-900 transition-colors"
      : "w-full text-sm border border-gray-200 px-3 py-2 pr-9 outline-none focus:border-gray-900 transition-colors";

  return (
    <div
      ref={containerRef}
      className={variant === "desktop" ? "hidden md:flex flex-1 max-w-xs relative" : "relative mb-3"}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(term);
        }}
        className="w-full"
      >
        <input
          type="search"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="타임딜 검색"
          autoComplete="off"
          className={inputCls}
        />
        <button
          type="submit"
          aria-label="검색"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto z-50">
          {suggestions.map((s, i) => (
            <li
              key={`${s}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(s);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIdx ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
