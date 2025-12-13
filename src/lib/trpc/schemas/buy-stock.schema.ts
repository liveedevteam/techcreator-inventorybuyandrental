import { z } from "zod";

/**
 * Buy Stock Validation Schemas
 */

export const updateBuyStockSchema = z.object({
  productId: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
  quantity: z.number().min(0, "จำนวนต้องไม่เป็นค่าลบ"),
  minQuantity: z.number().min(0, "จำนวนขั้นต่ำต้องไม่เป็นค่าลบ"),
});

export const adjustQuantitySchema = z.object({
  productId: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
  adjustment: z.number().refine((val) => val !== 0, {
    message: "การปรับจำนวนต้องไม่เป็น 0",
  }),
  reason: z.string().max(500, "เหตุผลไม่เกิน 500 ตัวอักษร").optional(),
});

export const getBuyStockByProductSchema = z.object({
  productId: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
});

export const listBuyStockSchema = z.object({
  lowStockOnly: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Type exports
export type UpdateBuyStockInput = z.infer<typeof updateBuyStockSchema>;
export type AdjustQuantityInput = z.infer<typeof adjustQuantitySchema>;
export type GetBuyStockByProductInput = z.infer<typeof getBuyStockByProductSchema>;
export type ListBuyStockInput = z.infer<typeof listBuyStockSchema>;
