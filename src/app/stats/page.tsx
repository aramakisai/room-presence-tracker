import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatsTable } from "@/components/StatsTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/presence">
              <Button variant="ghost" size="sm">
                ← 在室一覧
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">入退室ログ</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <StatsTable />
      </main>
    </div>
  );
}
