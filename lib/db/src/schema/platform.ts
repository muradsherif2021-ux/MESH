import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE", "LOCKED"]);
export const auditActionEnum = pgEnum("audit_action", [
  "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "STATUS_CHANGE",
  "PERMISSION_GRANT", "PERMISSION_REVOKE", "POST", "REVERSE",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM",
]);

// ─── Branches ──────────────────────────────────────────────────────────────────

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
}, (t) => [
  index("idx_branches_code").on(t.code),
]);

// ─── Roles ────────────────────────────────────────────────────────────────────

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Permissions ──────────────────────────────────────────────────────────────

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: text("module").notNull(),
  screen: text("screen").notNull(),
  action: text("action").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_permissions_msa").on(t.module, t.screen, t.action),
  index("idx_permissions_module").on(t.module),
]);

// ─── Role Permissions ─────────────────────────────────────────────────────────

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_role_permission").on(t.roleId, t.permissionId),
  index("idx_role_permissions_role").on(t.roleId),
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  branchId: uuid("branch_id").references(() => branches.id),
  roleId: uuid("role_id").references(() => roles.id),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
}, (t) => [
  index("idx_users_username").on(t.username),
  index("idx_users_email").on(t.email),
  index("idx_users_role").on(t.roleId),
]);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [
  index("idx_refresh_tokens_user").on(t.userId),
  index("idx_refresh_tokens_token").on(t.token),
]);

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value"),
  valueJson: jsonb("value_json"),
  category: text("category").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_settings_category").on(t.category),
]);

// ─── Numbering Sequences ──────────────────────────────────────────────────────

export const sequences = pgTable("sequences", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: text("module").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  prefix: text("prefix").notNull().default(""),
  suffix: text("suffix").notNull().default(""),
  includeYear: boolean("include_year").notNull().default(true),
  paddingLength: integer("padding_length").notNull().default(5),
  nextNumber: integer("next_number").notNull().default(1),
  resetYearly: boolean("reset_yearly").notNull().default(true),
  currentYear: integer("current_year"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Attachments ──────────────────────────────────────────────────────────────

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_attachments_entity").on(t.entityType, t.entityId),
]);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: auditActionEnum("action").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorUsername: text("actor_username"),
  before: jsonb("before"),
  after: jsonb("after"),
  note: text("note"),
  ipAddress: text("ip_address"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_audit_logs_entity").on(t.entityType, t.entityId),
  index("idx_audit_logs_actor").on(t.actorId),
  index("idx_audit_logs_created").on(t.createdAt),
]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  refreshTokens: many(refreshTokens),
  notifications: many(notifications),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
}));

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("INFO"),
  titleAr: text("title_ar").notNull(),
  bodyAr: text("body_ar"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_notifications_recipient").on(t.recipientId),
  index("idx_notifications_unread").on(t.recipientId, t.isRead),
]);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
}));
