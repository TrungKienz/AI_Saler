import axios from "axios";
import { env } from "../env";

// Thin wrapper around the third-party "source" shop API described in document.txt.
// This is the upstream we buy real stock from using OUR OWN api key/wallet.

const http = axios.create({
  baseURL: env.sourceBaseUrl,
  timeout: 15000,
});

function authHeaders(apiKey: string) {
  return { "X-API-Key": apiKey };
}

export interface SourceProduct {
  id: number;
  name: string;
  price: number; // VND, per the source shop's published catalog
  stock?: number;
  [key: string]: unknown;
}

export const sourceApi = {
  async getProducts(apiKey: string): Promise<SourceProduct[]> {
    const { data } = await http.get("/api/products", { headers: authHeaders(apiKey) });
    // The source API may wrap the list, so unwrap defensively.
    return Array.isArray(data) ? data : data.products ?? data.data ?? [];
  },

  async getBalance(apiKey: string) {
    const { data } = await http.get("/api/balance", { headers: authHeaders(apiKey) });
    return data;
  },

  async getRate() {
    const { data } = await http.get("/api/rate");
    return data;
  },

  async createDeposit(apiKey: string, amount: number, currency: "usdt" = "usdt") {
    const { data } = await http.post(
      "/api/deposit",
      { amount, currency },
      { headers: authHeaders(apiKey) }
    );
    return data;
  },

  async getDepositStatus(apiKey: string, code: string) {
    const { data } = await http.get("/api/deposit/status", {
      headers: authHeaders(apiKey),
      params: { code },
    });
    return data;
  },

  async buy(apiKey: string, productId: number, quantity: number, currency: "vnd" | "usdt" = "vnd") {
    const { data } = await http.post(
      "/api/buy",
      { product_id: productId, quantity, currency },
      { headers: authHeaders(apiKey) }
    );
    return data;
  },

  async getOrders(apiKey: string) {
    const { data } = await http.get("/api/orders", { headers: authHeaders(apiKey) });
    return data;
  },
};
