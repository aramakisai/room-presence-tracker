import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { presenceLogs, users } from "@/lib/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  userId: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { limit, offset, userId, since } = parsed.data;

  const conditions = [];
  if (userId) conditions.push(eq(presenceLogs.userId, userId));
  if (since) conditions.push(gte(presenceLogs.createdAt, new Date(since)));

  const logs = await db
    .select({
      id: presenceLogs.id,
      action: presenceLogs.action,
      triggeredBy: presenceLogs.triggeredBy,
      createdAt: presenceLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(presenceLogs)
    .innerJoin(users, eq(presenceLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(presenceLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ logs, limit, offset });
}
