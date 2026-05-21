"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightToBracket, faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";

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
      {isPending ? (
        "処理中…"
      ) : isPresent ? (
        <>
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-2" />
          退室する
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faArrowRightToBracket} className="mr-2" />
          在室する
        </>
      )}
    </Button>
  );
}
