import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  sub: z.string().min(1),
  name: z.string().min(1),
  email: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isKiosk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sub, name, email } = parsed.data;

  // Upsert user (handles first-time users who haven't logged in via OIDC)
  await db
    .insert(users)
    .values({ sub, name, email, isKiosk: false })
    .onConflictDoUpdate({
      target: users.sub,
      set: { name, email, updatedAt: new Date() },
    });

  const user = await db.query.users.findFirst({ where: eq(users.sub, sub) });
  if (!user) {
    return NextResponse.json({ error: "User not found after upsert" }, { status: 500 });
  }

  const newPresence = !user.isPresent;

  await db
    .update(users)
    .set({ isPresent: newPresence, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db.insert(presenceLogs).values({
    userId: user.id,
    action: newPresence ? "ENTER" : "EXIT",
    triggeredBy: "kiosk",
  });

  return NextResponse.json({ isPresent: newPresence, name: user.name });
}
