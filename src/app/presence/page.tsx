import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PresenceList } from "@/components/PresenceList";
import { ToggleButton } from "@/components/ToggleButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightToBracket, faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";

export default async function PresencePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">実行委員室</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/stats"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ログ
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* My status */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground">ログイン中: {user.name}</p>
          <p className="text-sm font-medium">
            現在の状態:{" "}
            <span
              className={user.isPresent ? "text-green-600" : "text-red-500"}
            >
              {user.isPresent ? (
              <>
                <FontAwesomeIcon icon={faArrowRightToBracket} className="mr-1" />
                在室中
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-1" />
                退室中
              </>
            )}
            </span>
          </p>
          <ToggleButton initialIsPresent={user.isPresent} />
        </div>

        {/* Room list */}
        <PresenceList />
      </main>
    </div>
  );
}
