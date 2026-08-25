import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  refreshedAt: timestamp("refreshedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Immutable, aggregate-only evidence from the scheduled 25-link portfolio validation. */
export const portfolioValidationRuns = mysqlTable("portfolio_validation_runs", {
  id: int("id").autoincrement().primaryKey(),
  taskUid: varchar("taskUid", { length: 65 }).notNull(),
  recordedAt: timestamp("recordedAt").notNull(),
  healthyCount: int("healthyCount").notNull(),
  degradedCount: int("degradedCount").notNull(),
  unavailableCount: int("unavailableCount").notNull(),
  checkedLinkCount: int("checkedLinkCount").notNull(),
  meanResponseMs: int("meanResponseMs"),
  medianResponseMs: int("medianResponseMs"),
  slowestResponseMs: int("slowestResponseMs"),
  source: varchar("source", { length: 255 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("portfolio_validation_runs_recorded_at_idx").on(table.recordedAt), index("portfolio_validation_runs_task_uid_idx").on(table.taskUid)]);

/** Per-link outcomes from a portfolio validation run. No response bodies, credentials, or package audit details are retained. */
export const portfolioValidationResults = mysqlTable("portfolio_validation_results", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  application: varchar("application", { length: 120 }).notNull(),
  url: varchar("url", { length: 2_048 }).notNull(),
  status: mysqlEnum("status", ["healthy", "degraded", "unavailable"]).notNull(),
  httpStatus: int("httpStatus"),
  responseTimeMs: int("responseTimeMs"),
  attemptCount: int("attemptCount").notNull(),
  pageTitle: varchar("pageTitle", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("portfolio_validation_results_run_id_idx").on(table.runId), index("portfolio_validation_results_status_idx").on(table.status)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DependencyAuditSnapshotRecord = typeof dependencyAuditSnapshots.$inferSelect;
export type InsertDependencyAuditSnapshot = typeof dependencyAuditSnapshots.$inferInsert;
export type PortfolioValidationRunRecord = typeof portfolioValidationRuns.$inferSelect;
export type PortfolioValidationResultRecord = typeof portfolioValidationResults.$inferSelect;

// TODO: Add your tables here
