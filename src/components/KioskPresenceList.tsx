"use client";

import { useEffect, useState, useCallback } from "react";

interface UserEntry {
  sub: string;
  dbId: string | null;
  name: string;
  email: string;
  isPresent: boolean;
}

export function KioskPresenceList() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const toggle = useCallback(async (user: UserEntry) => {
    if (toggling.has(user.sub)) return;
    setToggling((prev) => new Set(prev).add(user.sub));

    // Optimistic update
    setUsers((prev) =>
      prev
        .map((u) => (u.sub === user.sub ? { ...u, isPresent: !u.isPresent } : u))
        .sort((a, b) => {
          if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
          return a.name.localeCompare(b.name, "ja");
        })
    );

    try {
      const res = await fetch("/api/presence/user-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub: user.sub, name: user.name, email: user.email }),
      });
      if (!res.ok) {
        // Revert on failure
        setUsers((prev) =>
          prev
            .map((u) => (u.sub === user.sub ? { ...u, isPresent: user.isPresent } : u))
            .sort((a, b) => {
              if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
              return a.name.localeCompare(b.name, "ja");
            })
        );
      }
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev
          .map((u) => (u.sub === user.sub ? { ...u, isPresent: user.isPresent } : u))
          .sort((a, b) => {
            if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
            return a.name.localeCompare(b.name, "ja");
          })
      );
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(user.sub);
        return next;
      });
    }
  }, [toggling]);

  const presentCount = users.filter((u) => u.isPresent).length;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">在室状況</h2>
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
          {loading ? "…" : `${presentCount} / ${users.length}名`}
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-xs">読み込み中…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-xs">ユーザーが見つかりません</p>
      ) : (
        <ul className="space-y-1 overflow-y-auto max-h-96">
          {users.map((u) => {
            const busy = toggling.has(u.sub);
            return (
              <li key={u.sub}>
                <button
                  onClick={() => toggle(u)}
                  disabled={busy}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    busy
                      ? "opacity-50 cursor-wait"
                      : "hover:bg-gray-800 active:bg-gray-700 cursor-pointer"
                  }`}
                >
                  <span
                    className={`size-2.5 rounded-full flex-shrink-0 ${
                      u.isPresent ? "bg-green-400" : "bg-gray-600"
                    }`}
                  />
                  <span className={`text-sm ${u.isPresent ? "text-white" : "text-gray-400"}`}>
                    {u.name}
                  </span>
                  <span className="ml-auto text-xs text-gray-600">
                    {u.isPresent ? "在室" : "不在"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
