import { z } from "zod";

/**
 * Rental Asset Validation Schemas
 */

export const rentalAssetStatusSchema = z.enum([
  "available",
  "rented",
  "maintenance",
  "reserved",
  "damaged",
]);

export const createRentalAssetSchema = z.object({
  productId: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
  assetCode: z
    .string()
    .min(1, "รหัสทรัพย์สินจำเป็นต้องระบุ")
    .regex(/^[A-Z0-9-_]+$/, "รหัสทรัพย์สินต้องเป็นตัวพิมพ์ใหญ่ ตัวเลข ขีดกลาง และขีดล่างเท่านั้น")
    .transform((val) => val.toUpperCase()),
  status: rentalAssetStatusSchema.default("available"),
  notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
});

export const updateRentalAssetSchema = z.object({
  id: z.string().min(1, "ID ทรัพย์สินจำเป็นต้องระบุ"),
  assetCode: z
    .string()
    .min(1, "รหัสทรัพย์สินจำเป็นต้องระบุ")
    .regex(/^[A-Z0-9-_]+$/, "รหัสทรัพย์สินต้องเป็นตัวพิมพ์ใหญ่ ตัวเลข ขีดกลาง และขีดล่างเท่านั้น")
    .transform((val) => val.toUpperCase())
    .optional(),
  notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
});

export const updateAssetStatusSchema = z.object({
  id: z.string().min(1, "ID ทรัพย์สินจำเป็นต้องระบุ"),
  status: rentalAssetStatusSchema,
  notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
});

export const getAssetByIdSchema = z.object({
  id: z.string().min(1, "ID ทรัพย์สินจำเป็นต้องระบุ"),
});

export const listAssetsSchema = z.object({
  productId: z.string().optional(),
  status: rentalAssetStatusSchema.optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const deleteAssetSchema = z.object({
  id: z.string().min(1, "ID ทรัพย์สินจำเป็นต้องระบุ"),
});

// Type exports
export type RentalAssetStatus = z.infer<typeof rentalAssetStatusSchema>;
export type CreateRentalAssetInput = z.infer<typeof createRentalAssetSchema>;
export type UpdateRentalAssetInput = z.infer<typeof updateRentalAssetSchema>;
export type UpdateAssetStatusInput = z.infer<typeof updateAssetStatusSchema>;
export type GetAssetByIdInput = z.infer<typeof getAssetByIdSchema>;
export type ListAssetsInput = z.infer<typeof listAssetsSchema>;
export type DeleteAssetInput = z.infer<typeof deleteAssetSchema>;
