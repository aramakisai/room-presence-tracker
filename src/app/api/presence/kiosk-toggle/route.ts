import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  studentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isKiosk) {
      console.warn("[kiosk-toggle] Forbidden: isKiosk =", session?.user?.isKiosk, "userId =", session?.user?.id);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[kiosk-toggle] Failed to parse request body:", e);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      console.error("[kiosk-toggle] Body validation failed:", parsed.error.flatten());
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { studentId } = parsed.data;
    const normalizedId = studentId.toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(sql`lower(${users.studentId})`, normalizedId),
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
  } catch (err) {
    console.error("[kiosk-toggle] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
