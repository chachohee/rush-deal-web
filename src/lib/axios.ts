import axios from "axios";
import { useAuthStore } from "@/store/authStore";

// 브라우저에서는 Next.js rewrites를 통해 프록시, SSR에서는 직접 호출
const baseURL =
  typeof window === "undefined" ? process.env.NEXT_PUBLIC_API_URL : "";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
