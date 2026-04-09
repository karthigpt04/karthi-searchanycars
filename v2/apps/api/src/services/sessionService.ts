import { eq, and, lt } from "drizzle-orm";
import { db, sessions } from "@searchanycars/db";

export async function createSession(
  userId: number,
  refreshToken: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId,
    refreshToken,
    expiresAt,
    ipAddress: ip,
    userAgent,
  });
}

export async function findSession(
  refreshToken: string
): Promise<typeof sessions.$inferSelect | null> {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshToken, refreshToken))
    .limit(1);
  const session = rows[0] ?? null;
  if (session && session.expiresAt < new Date()) {
    await deleteSession(refreshToken);
    return null;
  }
  return session;
}

export async function deleteSession(refreshToken: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
}

export async function softDeleteSession(
  refreshToken: string,
  gracePeriodMs = 10_000,
): Promise<void> {
  await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() + gracePeriodMs) })
    .where(eq(sessions.refreshToken, refreshToken));
}

export async function deleteAllUserSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function cleanExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
