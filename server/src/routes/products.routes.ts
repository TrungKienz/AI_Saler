import { Router } from "express";
import { listProductsForSale } from "../services/product.service";

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  try {
    const products = await listProductsForSale();
    res.json({ products });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Failed to load products" });
  }
});
