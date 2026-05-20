import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default async function KioskPage() {
  const session = await auth();
  if (!session?.user?.isKiosk) redirect("/login");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-lg space-y-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">実行委員室 入退室</h1>
          <p className="text-gray-400">学生証をスキャンしてください</p>
        </div>

        {/* Scanner */}
        <BarcodeScanner />

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-8">
          Kiosk Mode · 問題がある場合は担当者にお問い合わせください
        </p>
      </div>
    </div>
  );
}
