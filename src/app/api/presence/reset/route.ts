import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.RESET_SECRET}`;

  if (!process.env.RESET_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all currently present users
  const presentUsers = await db.query.users.findMany({
    where: eq(users.isPresent, true),
    columns: { id: true },
  });

  if (presentUsers.length === 0) {
    return NextResponse.json({ reset: 0, message: "No users were present" });
  }

  // Reset all to not present
  await db.update(users).set({ isPresent: false, updatedAt: new Date() });

  // Log the reset for every user that was present
  const logEntries = presentUsers.map((u) => ({
    userId: u.id,
    action: "RESET" as const,
    triggeredBy: "system" as const,
  }));

  await db.insert(presenceLogs).values(logEntries);

  return NextResponse.json({
    reset: presentUsers.length,
    message: `Reset ${presentUsers.length} users`,
  });
}
