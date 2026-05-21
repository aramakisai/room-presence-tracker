"use client";

import QRCode from "react-qr-code";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMobileScreen } from "@fortawesome/free-solid-svg-icons";

interface QrCodeDisplayProps {
  value: string;
}

export function QrCodeDisplay({ value }: QrCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-300">
        <FontAwesomeIcon icon={faMobileScreen} className="mr-1" />
        QRで入退室
      </p>
      <div className="bg-white p-3 rounded-xl">
        <QRCode value={value} size={160} level="M" />
      </div>
      <p className="text-xs text-gray-500 text-center">
        スマートフォンでスキャンして
        <br />在室状態をトグル
      </p>
    </div>
  );
}
