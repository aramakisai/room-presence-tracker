"use client";

import { useEffect, useState, useCallback } from "react";

interface PresentUser {
  id: string;
  name: string;
  email: string;
}

export function KioskPresenceList() {
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
    const interval = setInterval(fetchPresence, 15000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">現在の在室者</h2>
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
          {loading ? "…" : `${count}名`}
        </span>
      </div>
      {loading ? (
        <p className="text-gray-500 text-xs">読み込み中…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-xs">現在在室者はいません</p>
      ) : (
        <ul className="space-y-1.5">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-2 text-sm text-white"
            >
              <span className="size-2 rounded-full bg-green-400 inline-block flex-shrink-0" />
              <span>{u.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
