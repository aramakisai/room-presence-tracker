import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  studentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isKiosk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { studentId } = parsed.data;
  const user = await db.query.users.findFirst({
    where: eq(users.studentId, studentId),
  });

  if (!user) {
    return NextResponse.json(
      { error: "Student not found", studentId },
      { status: 404 }
    );
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

  return NextResponse.json({
    isPresent: newPresence,
    name: user.name,
    studentId,
  });
}
