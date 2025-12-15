import { z } from "zod";

/**
 * Sale Validation Schemas
 */

export const saleItemSchema = z.object({
  productId: z.string().min(1, "ID สินค้าจำเป็นต้องระบุ"),
  productName: z.string().min(1, "ชื่อสินค้าจำเป็นต้องระบุ"),
  sku: z.string().min(1, "SKU จำเป็นต้องระบุ"),
  quantity: z.number().min(1, "จำนวนต้องไม่น้อยกว่า 1"),
  unitPrice: z.number().min(0, "ราคาต่อหน่วยต้องไม่เป็นค่าลบ"),
  totalPrice: z.number().min(0, "ราคารวมต้องไม่เป็นค่าลบ"),
});

export const createSaleSchema = z
  .object({
    customerName: z
      .string()
      .min(1, "ชื่อลูกค้าจำเป็นต้องระบุ")
      .max(200, "ชื่อลูกค้าไม่เกิน 200 ตัวอักษร"),
    customerPhone: z.string().max(20, "เบอร์โทรศัพท์ไม่เกิน 20 ตัวอักษร").optional(),
    customerEmail: z.string().email("อีเมลไม่ถูกต้อง").optional(),
    customerAddress: z.string().max(500, "ที่อยู่ไม่เกิน 500 ตัวอักษร").optional(),
    items: z.array(saleItemSchema).min(1, "ต้องเลือกสินค้าอย่างน้อย 1 รายการ"),
    subtotal: z.number().min(0, "ยอดรวมต้องไม่เป็นค่าลบ"),
    discount: z.number().min(0, "ส่วนลดต้องไม่เป็นค่าลบ").default(0),
    tax: z.number().min(0, "ภาษีต้องไม่เป็นค่าลบ").default(0),
    totalAmount: z.number().min(0, "ยอดรวมทั้งสิ้นต้องไม่เป็นค่าลบ"),
    deposit: z.number().min(0, "เงินมัดจำต้องไม่เป็นค่าลบ").default(0),
    paymentMethod: z.enum(["cash", "card", "transfer", "other"]).optional(),
    paymentStatus: z.enum(["pending", "paid", "partial"]).default("pending"),
    paidAmount: z.number().min(0, "จำนวนเงินที่จ่ายต้องไม่เป็นค่าลบ").default(0),
    notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
  })
  .refine(
    (data) => {
      // Validate that items total matches subtotal
      const itemsTotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
      return Math.abs(itemsTotal - data.subtotal) < 0.01; // Allow small floating point differences
    },
    {
      message: "ยอดรวมสินค้าไม่ตรงกับยอดรวม",
      path: ["subtotal"],
    }
  )
  .refine(
    (data) => {
      // Validate that total amount = subtotal - discount + tax
      const calculatedTotal = data.subtotal - data.discount + data.tax;
      return Math.abs(calculatedTotal - data.totalAmount) < 0.01;
    },
    {
      message: "ยอดรวมทั้งสิ้นไม่ถูกต้อง (ยอดรวม = ยอดรวม - ส่วนลด + ภาษี)",
      path: ["totalAmount"],
    }
  );

export const updateSaleSchema = z.object({
  id: z.string().min(1, "ID การขายจำเป็นต้องระบุ"),
  customerName: z
    .string()
    .min(1, "ชื่อลูกค้าจำเป็นต้องระบุ")
    .max(200, "ชื่อลูกค้าไม่เกิน 200 ตัวอักษร")
    .optional(),
  customerPhone: z.string().max(20, "เบอร์โทรศัพท์ไม่เกิน 20 ตัวอักษร").optional(),
  customerEmail: z.string().email("อีเมลไม่ถูกต้อง").optional(),
  customerAddress: z.string().max(500, "ที่อยู่ไม่เกิน 500 ตัวอักษร").optional(),
  items: z.array(saleItemSchema).min(1, "ต้องเลือกสินค้าอย่างน้อย 1 รายการ").optional(),
  subtotal: z.number().min(0, "ยอดรวมต้องไม่เป็นค่าลบ").optional(),
  discount: z.number().min(0, "ส่วนลดต้องไม่เป็นค่าลบ").optional(),
  tax: z.number().min(0, "ภาษีต้องไม่เป็นค่าลบ").optional(),
  totalAmount: z.number().min(0, "ยอดรวมทั้งสิ้นต้องไม่เป็นค่าลบ").optional(),
  deposit: z.number().min(0, "เงินมัดจำต้องไม่เป็นค่าลบ").optional(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "partial"]).optional(),
  paidAmount: z.number().min(0, "จำนวนเงินที่จ่ายต้องไม่เป็นค่าลบ").optional(),
  notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
});

export const updateSaleStatusSchema = z.object({
  id: z.string().min(1, "ID การขายจำเป็นต้องระบุ"),
  status: z.enum(["pending", "completed", "cancelled"]),
  notes: z.string().max(1000, "หมายเหตุไม่เกิน 1000 ตัวอักษร").optional(),
});

export const getSaleByIdSchema = z.object({
  id: z.string().min(1, "ID การขายจำเป็นต้องระบุ"),
});

export const listSalesSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "partial"]).optional(),
  customerName: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const deleteSaleSchema = z.object({
  id: z.string().min(1, "ID การขายจำเป็นต้องระบุ"),
});

// Type exports
export type SaleItem = z.infer<typeof saleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
export type UpdateSaleStatusInput = z.infer<typeof updateSaleStatusSchema>;
export type GetSaleByIdInput = z.infer<typeof getSaleByIdSchema>;
export type ListSalesInput = z.infer<typeof listSalesSchema>;
export type DeleteSaleInput = z.infer<typeof deleteSaleSchema>;
