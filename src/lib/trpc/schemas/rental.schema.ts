import { z } from "zod";

/**
 * Rental Validation Schemas
 */

export const rentalStatusSchema = z.enum(["pending", "active", "completed", "cancelled"]);

export const createRentalSchema = z
  .object({
    customerName: z.string().min(1, "ชื่อลูกค้าจำเป็นต้องระบุ").max(200, "ชื่อลูกค้าไม่เกิน 200 ตัวอักษร"),
    customerPhone: z.string().max(20, "เบอร์โทรศัพท์ไม่เกิน 20 ตัวอักษร").optional(),
    customerEmail: z.string().email("อีเมลไม่ถูกต้อง").optional(),
    customerAddress: z.string().max(500, "ที่อยู่ไม่เกิน 500 ตัวอักษร").optional(),
    assets: z
      .array(z.string().min(1, "ID ทรัพย์สินจำเป็นต้องระบุ"))
      .min(1, "ต้องเลือกทรัพย์สินอย่างน้อย 1 รายการ"),
    startDate: z.coerce.date({
      message: "วันที่เริ่มต้นจำเป็นต้องระบุ",
    }),
    endDate: z.coerce.date({
      message: "วันที่สิ้นสุดจำเป็นต้องระบุ",
    }),
    expectedReturnDate: z.coerce.date().optional(),
    dailyRate: z.number().min(0, "อัตรารายวันต้องไม่เป็นค่าลบ"),
    deposit: z.number().min(0, "เงินมัดจำต้องไม่เป็นค่าลบ").default(0),
    notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น",
    path: ["endDate"],
  });

export const updateRentalSchema = z
  .object({
    id: z.string().min(1, "ID การเช่าจำเป็นต้องระบุ"),
    customerName: z.string().min(1, "ชื่อลูกค้าจำเป็นต้องระบุ").max(200, "ชื่อลูกค้าไม่เกิน 200 ตัวอักษร").optional(),
    customerPhone: z.string().max(20, "เบอร์โทรศัพท์ไม่เกิน 20 ตัวอักษร").optional(),
    customerEmail: z.string().email("อีเมลไม่ถูกต้อง").optional(),
    customerAddress: z.string().max(500, "ที่อยู่ไม่เกิน 500 ตัวอักษร").optional(),
    assets: z
      .array(z.string().min(1, "ID ทรัพย์สินจำเป็นต้องระบุ"))
      .min(1, "ต้องเลือกทรัพย์สินอย่างน้อย 1 รายการ")
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    expectedReturnDate: z.coerce.date().optional(),
    dailyRate: z.number().min(0, "อัตรารายวันต้องไม่เป็นค่าลบ").optional(),
    deposit: z.number().min(0, "เงินมัดจำต้องไม่เป็นค่าลบ").optional(),
    notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: "วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น",
      path: ["endDate"],
    }
  );

export const updateRentalStatusSchema = z.object({
  id: z.string().min(1, "ID การเช่าจำเป็นต้องระบุ"),
  status: rentalStatusSchema,
  actualReturnDate: z.coerce.date().optional(),
  penaltyRate: z.number().min(0, "อัตราค่าปรับต้องไม่เป็นค่าลบ").optional(),
  notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
});

export const getRentalByIdSchema = z.object({
  id: z.string().min(1, "ID การเช่าจำเป็นต้องระบุ"),
});

export const listRentalsSchema = z.object({
  status: rentalStatusSchema.optional(),
  customerEmail: z.string().email().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const cancelRentalSchema = z.object({
  id: z.string().min(1, "ID การเช่าจำเป็นต้องระบุ"),
  reason: z.string().max(500, "เหตุผลไม่เกิน 500 ตัวอักษร").optional(),
});

// Type exports
export type RentalStatus = z.infer<typeof rentalStatusSchema>;
export type CreateRentalInput = z.infer<typeof createRentalSchema>;
export type UpdateRentalInput = z.infer<typeof updateRentalSchema>;
export type UpdateRentalStatusInput = z.infer<typeof updateRentalStatusSchema>;
export type GetRentalByIdInput = z.infer<typeof getRentalByIdSchema>;
export type ListRentalsInput = z.infer<typeof listRentalsSchema>;
export type CancelRentalInput = z.infer<typeof cancelRentalSchema>;
