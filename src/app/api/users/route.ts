import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { fetchAuthentikUsers } from "@/lib/authentik";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isKiosk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [authentikUsers, dbUsers] = await Promise.all([
    fetchAuthentikUsers(),
    db.query.users.findMany({
      columns: { sub: true, id: true, isPresent: true, isKiosk: true },
    }),
  ]);

  const dbBySub = new Map(dbUsers.map((u) => [u.sub, u]));

  const result = authentikUsers
    .filter((u) => !u.groups_obj.some((g) => g.name === "kiosk"))
    .map((u) => {
      const db = dbBySub.get(u.pk);
      return {
        sub: u.pk,
        dbId: db?.id ?? null,
        name: u.name,
        email: u.email,
        isPresent: db?.isPresent ?? false,
      };
    })
    .sort((a, b) => {
      if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
      return a.name.localeCompare(b.name, "ja");
    });

  return NextResponse.json({ users: result });
}
