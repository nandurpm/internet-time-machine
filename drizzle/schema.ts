import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Project-level, dated aggregate results from validated production dependency audits. */
export const dependencyAuditSnapshots = mysqlTable("dependency_audit_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  recordedAt: timestamp("recordedAt").notNull(),
  total: int("total").notNull(),
  critical: int("critical").notNull(),
  high: int("high").notNull(),
  moderate: int("moderate").notNull(),
  low: int("low").notNull(),
  directPackages: int("directPackages").notNull(),
  transitivePackages: int("transitivePackages").notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DependencyAuditSnapshotRecord = typeof dependencyAuditSnapshots.$inferSelect;
export type InsertDependencyAuditSnapshot = typeof dependencyAuditSnapshots.$inferInsert;

// TODO: Add your tables here
