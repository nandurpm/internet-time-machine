-- ============================================================
-- FILE: 0002_condemned_doctor_spectrum.sql
-- PURPOSE: Applies the 0002_condemned_doctor_spectrum Drizzle migration to evolve the application's persisted monitoring, authentication, or reporting schema.
-- ============================================================

ALTER TABLE `dependency_audit_snapshots` ADD `refreshedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;
