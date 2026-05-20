import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">実行委員室 在室管理</CardTitle>
          <CardDescription>
            Authentik アカウントでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("authentik", { redirectTo: "/" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Authentik でログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
