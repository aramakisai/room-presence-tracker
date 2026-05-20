"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ToggleButtonProps {
  initialIsPresent: boolean;
}

export function ToggleButton({ initialIsPresent }: ToggleButtonProps) {
  const [isPresent, setIsPresent] = useState(initialIsPresent);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    startTransition(async () => {
      const res = await fetch("/api/presence/toggle", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIsPresent(data.isPresent);
        router.refresh();
      }
    });
  };

  return (
    <Button
      size="lg"
      variant={isPresent ? "destructive" : "default"}
      onClick={handleToggle}
      disabled={isPending}
      className="w-full text-base font-semibold py-6"
    >
      {isPending
        ? "処理中…"
        : isPresent
        ? "🔴 退室する"
        : "🟢 在室する"}
    </Button>
  );
}
