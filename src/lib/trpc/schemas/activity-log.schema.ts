import { z } from "zod";

/**
 * Activity Log Validation Schemas
 */

export const activityActionSchema = z.enum(["create", "update", "delete"]);
export const activityEntityTypeSchema = z.enum([
  "product",
  "buyStock",
  "rentalAsset",
  "rental",
  "user",
]);

export const listActivityLogsSchema = z.object({
  userId: z.string().optional(),
  entityType: activityEntityTypeSchema.optional(),
  entityId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const getActivityLogByIdSchema = z.object({
  id: z.string().min(1, "ID บันทึกกิจกรรมจำเป็นต้องระบุ"),
});

export const filterActivityLogsSchema = z.object({
  userId: z.string().optional(),
  entityType: activityEntityTypeSchema.optional(),
  entityId: z.string().optional(),
  action: activityActionSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Type exports
export type ActivityAction = z.infer<typeof activityActionSchema>;
export type ActivityEntityType = z.infer<typeof activityEntityTypeSchema>;
export type ListActivityLogsInput = z.infer<typeof listActivityLogsSchema>;
export type GetActivityLogByIdInput = z.infer<typeof getActivityLogByIdSchema>;
export type FilterActivityLogsInput = z.infer<typeof filterActivityLogsSchema>;
