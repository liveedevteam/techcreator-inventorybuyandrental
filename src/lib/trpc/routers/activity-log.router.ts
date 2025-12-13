/**
 * Activity Log Router
 * 
 * tRPC router for activity log endpoints.
 * Provides access to system activity logs for auditing purposes.
 * All endpoints require super admin role.
 */

import { createTRPCRouter, superAdminProcedure } from "../trpc";
import {
  listActivityLogsSchema,
  getActivityLogByIdSchema,
  filterActivityLogsSchema,
} from "../schemas";
import * as activityLogService from "../services/activity-log.service";

export const activityLogRouter = createTRPCRouter({
  /**
   * List activity logs with filtering and pagination
   * 
   * Requires super admin role.
   * Supports filtering by user, entity type, entity ID, and date range.
   */
  list: superAdminProcedure
    .input(listActivityLogsSchema)
    .query(({ input }) => activityLogService.listActivityLogs(input)),

  /**
   * Get a single activity log by ID
   * 
   * Requires super admin role.
   */
  getById: superAdminProcedure
    .input(getActivityLogByIdSchema)
    .query(({ input }) => activityLogService.getActivityLogById(input)),

  /**
   * Filter activity logs with advanced filters
   * 
   * Requires super admin role.
   * Similar to list but includes action type filter.
   */
  filter: superAdminProcedure
    .input(filterActivityLogsSchema)
    .query(({ input }) => activityLogService.filterActivityLogs(input)),
});
