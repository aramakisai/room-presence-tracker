import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { QrCodeDisplay } from "@/components/QrCodeDisplay";
import { KioskPresenceList } from "@/components/KioskPresenceList";

export default async function KioskPage() {
  const session = await auth();
  if (!session?.user?.isKiosk) redirect("/login");

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/presence/qr-toggle`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-5xl space-y-6">
        {/* タイトル */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">実行委員室 入退室</h1>
          <p className="text-gray-400">学生証をスキャンしてください</p>
        </div>

        {/* 2カラムグリッド */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 左: バーコードスキャナ + QRコード（縦積み） */}
          <div className="space-y-4">
            <BarcodeScanner />
            <QrCodeDisplay value={qrUrl} />
          </div>

          {/* 右: 在室者リスト（全員表示） */}
          <KioskPresenceList />
        </div>

        {/* フッター */}
        <p className="text-center text-xs text-gray-600">
          Kiosk Mode · 問題がある場合は担当者にお問い合わせください
        </p>
      </div>
    </div>
  );
}
