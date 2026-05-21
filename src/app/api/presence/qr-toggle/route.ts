import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // キオスクアカウントはQRトグル機能を使用しない
  if (session.user.isKiosk) {
    redirect("/kiosk");
  }

  const userId = session.user.id;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    redirect("/login");
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

  redirect(`/presence/toggled?result=${newPresence ? "entered" : "exited"}`);
}
