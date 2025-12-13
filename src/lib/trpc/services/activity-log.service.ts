/**
 * Activity Log Service
 * 
 * Handles all activity log-related business logic including:
 * - Creating activity log entries
 * - Querying and filtering activity logs
 * - Tracking user actions and changes
 */

import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import ActivityLog, {
  type ActivityAction,
  type ActivityEntityType,
} from "@/lib/db/models/activity-log";
import type {
  ListActivityLogsInput,
  GetActivityLogByIdInput,
  FilterActivityLogsInput,
} from "../schemas";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Populated user type (when userId is populated with name and email)
 */
type PopulatedUser = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
};

/**
 * Type guard to check if user is populated
 */
function isPopulatedUser(
  user: PopulatedUser | mongoose.Types.ObjectId
): user is PopulatedUser {
  return typeof user === "object" && "_id" in user && "name" in user;
}

/**
 * Activity Log Data Transfer Object
 * 
 * Represents an activity log entry with user and entity information.
 */
export interface ActivityLogDTO {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  changes?: {
    old?: Record<string, unknown>;
    new?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new activity log entry
 * 
 * Records user actions (create, update, delete) on entities.
 * Optionally tracks changes (old/new values) and request metadata.
 * 
 * @param userId - ID of user performing the action
 * @param action - Type of action (create, update, delete)
 * @param entityType - Type of entity being acted upon
 * @param entityId - ID of the entity
 * @param entityName - Display name of the entity
 * @param changes - Optional old/new values for updates
 * @param ipAddress - Optional IP address of the request
 * @param userAgent - Optional user agent string
 */
export async function createActivityLog(
  userId: string,
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  changes?: { old?: Record<string, unknown>; new?: Record<string, unknown> },
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await connectToDatabase();

  await ActivityLog.create({
    userId,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    ipAddress,
    userAgent,
  });
}

/**
 * List activity logs with filtering and pagination
 * 
 * Supports filtering by user, entity type, entity ID, and date range.
 * 
 * @param input - List filters and pagination parameters
 * @returns Object containing logs array and total count
 */
export async function listActivityLogs(
  input: ListActivityLogsInput
): Promise<{ logs: ActivityLogDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================
  
  const query: Record<string, unknown> = {};

  // Filter by user ID
  if (input.userId) {
    query.userId = input.userId;
  }

  // Filter by entity type
  if (input.entityType) {
    query.entityType = input.entityType;
  }

  // Filter by entity ID
  if (input.entityId) {
    query.entityId = input.entityId;
  }

  // Filter by date range
  if (input.startDate || input.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (input.startDate) {
      dateFilter.$gte = input.startDate;
    }
    if (input.endDate) {
      dateFilter.$lte = input.endDate;
    }
    query.createdAt = dateFilter;
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================
  
  const skip = (input.page - 1) * input.limit;
  const total = await ActivityLog.countDocuments(query);

  const logs = await ActivityLog.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(input.limit)
    .lean();

  return {
    logs: logs.map((log) => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: isPopulatedUser(log.userId) ? log.userId.name : undefined,
      userEmail: isPopulatedUser(log.userId) ? log.userId.email : undefined,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      changes: log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> },
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    })),
    total,
  };
}

/**
 * Get a single activity log by ID
 * 
 * @param input - Activity log ID
 * @returns Activity log DTO with populated user information
 * @throws Error if log not found
 */
export async function getActivityLogById(
  input: GetActivityLogByIdInput
): Promise<ActivityLogDTO> {
  await connectToDatabase();

  const log = await ActivityLog.findById(input.id).populate("userId", "name email").lean();

  if (!log) {
    throw new Error("Activity log not found");
  }

  return {
    id: log._id.toString(),
    userId: log.userId.toString(),
    userName: isPopulatedUser(log.userId) ? log.userId.name : undefined,
    userEmail: isPopulatedUser(log.userId) ? log.userId.email : undefined,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityName: log.entityName,
    changes: log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> },
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}

/**
 * Filter activity logs with advanced filters
 * 
 * Similar to listActivityLogs but includes action filter.
 * 
 * @param input - Advanced filter parameters including action type
 * @returns Object containing logs array and total count
 */
export async function filterActivityLogs(
  input: FilterActivityLogsInput
): Promise<{ logs: ActivityLogDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================
  
  const query: Record<string, unknown> = {};

  // Filter by user ID
  if (input.userId) {
    query.userId = input.userId;
  }

  // Filter by entity type
  if (input.entityType) {
    query.entityType = input.entityType;
  }

  // Filter by entity ID
  if (input.entityId) {
    query.entityId = input.entityId;
  }

  // Filter by action type
  if (input.action) {
    query.action = input.action;
  }

  // Filter by date range
  if (input.startDate || input.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (input.startDate) {
      dateFilter.$gte = input.startDate;
    }
    if (input.endDate) {
      dateFilter.$lte = input.endDate;
    }
    query.createdAt = dateFilter;
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================
  
  const skip = (input.page - 1) * input.limit;
  const total = await ActivityLog.countDocuments(query);

  const logs = await ActivityLog.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(input.limit)
    .lean();

  return {
    logs: logs.map((log) => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: isPopulatedUser(log.userId) ? log.userId.name : undefined,
      userEmail: isPopulatedUser(log.userId) ? log.userId.email : undefined,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      changes: log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> },
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    })),
    total,
  };
}
