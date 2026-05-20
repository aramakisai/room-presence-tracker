"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PresentUser {
  id: string;
  name: string;
  email: string;
}

export function PresenceList() {
  const [users, setUsers] = useState<PresentUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setCount(data.count);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresence();
    // Poll every 15 seconds
    const interval = setInterval(fetchPresence, 15000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>現在の在室者</span>
          <Badge variant={count > 0 ? "default" : "secondary"}>
            {loading ? "…" : `${count}名`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">読み込み中…</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            現在、在室している人はいません。
          </p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-green-500 inline-block" />
                <span className="font-medium">{u.name}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
