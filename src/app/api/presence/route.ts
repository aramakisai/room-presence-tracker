import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presentUsers = await db.query.users.findMany({
    where: eq(users.isPresent, true),
    columns: {
      id: true,
      name: true,
      email: true,
      isKiosk: true,
    },
    orderBy: (u, { asc }) => [asc(u.name)],
  });

  // Filter out kiosk accounts from the displayed list
  const humanUsers = presentUsers.filter((u) => !u.isKiosk);

  return NextResponse.json({ users: humanUsers, count: humanUsers.length });
}
