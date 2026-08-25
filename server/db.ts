import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { dependencyAuditSnapshots, InsertDependencyAuditSnapshot, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type DependencyAuditRefreshInput = Omit<InsertDependencyAuditSnapshot, "id" | "createdAt" | "recordedAt">;

export async function listDependencyAuditSnapshots() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dependencyAuditSnapshots).orderBy(desc(dependencyAuditSnapshots.recordedAt));
}

export async function recordDependencyAuditSnapshot(input: DependencyAuditRefreshInput, recordedAt = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Dependency-audit persistence is unavailable.");

  const startOfDay = new Date(Date.UTC(recordedAt.getUTCFullYear(), recordedAt.getUTCMonth(), recordedAt.getUTCDate()));
  const nextDay = new Date(startOfDay.getTime() + 86_400_000);
  const existing = await db.select().from(dependencyAuditSnapshots)
    .where(and(gte(dependencyAuditSnapshots.recordedAt, startOfDay), lt(dependencyAuditSnapshots.recordedAt, nextDay)))
    .limit(1);
  if (existing[0]) {
    await db.update(dependencyAuditSnapshots)
      .set({ ...input, refreshedAt: new Date() })
      .where(eq(dependencyAuditSnapshots.id, existing[0].id));
    const [snapshot] = await db.select().from(dependencyAuditSnapshots)
      .where(eq(dependencyAuditSnapshots.id, existing[0].id))
      .limit(1);
    if (!snapshot) throw new Error("Dependency-audit snapshot could not be read after refreshing.");
    return { snapshot, inserted: false };
  }

  await db.insert(dependencyAuditSnapshots).values({ ...input, recordedAt, refreshedAt: new Date() });
  const [snapshot] = await db.select().from(dependencyAuditSnapshots)
    .where(eq(dependencyAuditSnapshots.recordedAt, recordedAt))
    .limit(1);
  if (!snapshot) throw new Error("Dependency-audit snapshot could not be read after recording.");
  return { snapshot, inserted: true };
}

// TODO: add feature queries here as your schema grows.
