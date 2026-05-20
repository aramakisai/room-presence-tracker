"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface LogEntry {
  id: string;
  action: "ENTER" | "EXIT" | "RESET";
  triggeredBy: "self" | "kiosk" | "discord" | "system";
  createdAt: string;
  userName: string;
  userEmail: string;
}

const ACTION_LABEL: Record<string, string> = {
  ENTER: "入室",
  EXIT: "退室",
  RESET: "リセット",
};

const ACTION_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ENTER: "default",
  EXIT: "secondary",
  RESET: "destructive",
};

const TRIGGER_LABEL: Record<string, string> = {
  self: "本人",
  kiosk: "キオスク",
  discord: "Discord",
  system: "システム",
};

const PAGE_SIZE = 50;

export function StatsTable() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(
    async (currentOffset: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stats?limit=${PAGE_SIZE}&offset=${currentOffset}`
        );
        if (res.ok) {
          const data = await res.json();
          if (currentOffset === 0) {
            setLogs(data.logs);
          } else {
            setLogs((prev) => [...prev, ...data.logs]);
          }
          setHasMore(data.logs.length === PAGE_SIZE);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const loadMore = () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    fetchLogs(next);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日時</TableHead>
            <TableHead>氏名</TableHead>
            <TableHead>アクション</TableHead>
            <TableHead>操作元</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm:ss", {
                  locale: ja,
                })}
              </TableCell>
              <TableCell className="font-medium">{log.userName}</TableCell>
              <TableCell>
                <Badge variant={ACTION_VARIANT[log.action]}>
                  {ACTION_LABEL[log.action] ?? log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {TRIGGER_LABEL[log.triggeredBy] ?? log.triggeredBy}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                ログがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "読み込み中…" : "さらに読み込む"}
          </Button>
        </div>
      )}
    </div>
  );
}
