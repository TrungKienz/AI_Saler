import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: "CUSTOMER" | "ADMIN";
  balanceVnd: number;
  telegramUsername: string | null;
}

export interface Product {
  id: string;
  sourceProductId: number;
  name: string;
  priceVnd: number;
  inStock: boolean;
  stock: number;
}

export interface Deposit {
  id: string;
  code: string;
  method: "VIETQR" | "USDT";
  amountVnd: number | null;
  amountUsdt: number | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  confirmedVnd: number | null;
  txHash: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  productName: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  failReason: string | null;
  createdAt: string;
}

export function apiErrorMessage(err: unknown, fallback = "Đã có lỗi xảy ra"): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.error ?? anyErr?.message ?? fallback;
}
