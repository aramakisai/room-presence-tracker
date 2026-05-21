"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRedirect() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.push("/presence");
    }, 3000);
    return () => clearTimeout(t);
  }, [router]);

  return null;
}
