"use client";

import { useEffect, useState, useCallback } from "react";
import { createContext, useContext, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-600",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {items.map((item) => (
          <ToastItem key={item.id} item={item} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => setVisible(false), 2700);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 text-white text-sm font-medium shadow-lg pointer-events-auto
        transition-all duration-300 ${COLORS[item.type]}
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
    >
      <span className="w-5 h-5 bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
        {ICONS[item.type]}
      </span>
      {item.message}
    </div>
  );
}
