import { z } from "zod";

/**
 * Product Validation Schemas
 */

export const stockTypeSchema = z.enum(["buy", "rental"]);

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "ชื่อสินค้าต้องมีอย่างน้อย 1 ตัวอักษร")
    .max(200, "ชื่อสินค้าไม่เกิน 200 ตัวอักษร"),
  description: z.string().max(2000, "คำอธิบายไม่เกิน 2000 ตัวอักษร").optional(),
  sku: z
    .string()
    .min(1, "SKU จำเป็นต้องระบุ")
    .regex(/^[A-Z0-9-_]+$/, "SKU ต้องเป็นตัวพิมพ์ใหญ่ ตัวเลข ขีดกลาง และขีดล่างเท่านั้น")
    .transform((val) => val.toUpperCase()),
  category: z.string().max(100, "หมวดหมู่ไม่เกิน 100 ตัวอักษร").optional(),
  price: z.number().min(0, "ราคาต้องไม่เป็นค่าลบ").optional(),
  unit: z.string().max(20, "หน่วยไม่เกิน 20 ตัวอักษร").optional(),
  images: z.array(z.string().url("URL รูปภาพไม่ถูกต้อง")).optional(),
  stockType: stockTypeSchema,
  dailyRentalRate: z.number().min(0, "ค่าเช่ารายวันต้องไม่เป็นค่าลบ").optional(),
  monthlyRentalRate: z.number().min(0, "ค่าเช่ารายเดือนต้องไม่เป็นค่าลบ").optional(),
  insuranceFee: z.number().min(0, "ค่าประกันสินค้าต้องไม่เป็นค่าลบ").optional(),
  replacementPrice: z.number().min(0, "ราคากรณีสูญหายต้องไม่เป็นค่าลบ").optional(),
});

export const updateProductSchema = z.object({
  id: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
  name: z
    .string()
    .min(1, "ชื่อสินค้าต้องมีอย่างน้อย 1 ตัวอักษร")
    .max(200, "ชื่อสินค้าไม่เกิน 200 ตัวอักษร")
    .optional(),
  description: z.string().max(2000, "คำอธิบายไม่เกิน 2000 ตัวอักษร").optional(),
  sku: z
    .string()
    .min(1, "SKU จำเป็นต้องระบุ")
    .regex(/^[A-Z0-9-_]+$/, "SKU ต้องเป็นตัวพิมพ์ใหญ่ ตัวเลข ขีดกลาง และขีดล่างเท่านั้น")
    .transform((val) => val.toUpperCase())
    .optional(),
  category: z.string().max(100, "หมวดหมู่ไม่เกิน 100 ตัวอักษร").optional(),
  price: z.number().min(0, "ราคาต้องไม่เป็นค่าลบ").optional(),
  unit: z.string().max(20, "หน่วยไม่เกิน 20 ตัวอักษร").optional(),
  images: z.array(z.string().url("URL รูปภาพไม่ถูกต้อง")).optional(),
  stockType: stockTypeSchema.optional(),
  dailyRentalRate: z.number().min(0, "ค่าเช่ารายวันต้องไม่เป็นค่าลบ").optional(),
  monthlyRentalRate: z.number().min(0, "ค่าเช่ารายเดือนต้องไม่เป็นค่าลบ").optional(),
  insuranceFee: z.number().min(0, "ค่าประกันสินค้าต้องไม่เป็นค่าลบ").optional(),
  replacementPrice: z.number().min(0, "ราคากรณีสูญหายต้องไม่เป็นค่าลบ").optional(),
});

export const getProductByIdSchema = z.object({
  id: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
});

export const listProductsSchema = z.object({
  stockType: stockTypeSchema.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const deleteProductSchema = z.object({
  id: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
});

// Type exports
export type StockType = z.infer<typeof stockTypeSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type GetProductByIdInput = z.infer<typeof getProductByIdSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
