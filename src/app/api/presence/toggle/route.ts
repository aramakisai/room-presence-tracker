import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newPresence = !user.isPresent;

  await db
    .update(users)
    .set({ isPresent: newPresence, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(presenceLogs).values({
    userId,
    action: newPresence ? "ENTER" : "EXIT",
    triggeredBy: "self",
  });

  return NextResponse.json({ isPresent: newPresence });
}
