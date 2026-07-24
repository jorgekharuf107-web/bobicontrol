import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEY = "bobi.offline.queue.v1";

export type QueuedOp = {
  id: string;
  createdAt: number;
  table: "movimentacoes" | "agendamentos_entrega";
  payload: Record<string, any>;
};

function readQueue(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedOp[]) {
  window.localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent("bobi:queue-change"));
}

export function queueSize(): number {
  return readQueue().length;
}

export function enqueue(op: Omit<QueuedOp, "id" | "createdAt">) {
  const q = readQueue();
  q.push({ ...op, id: crypto.randomUUID(), createdAt: Date.now() });
  writeQueue(q);
}

let syncing = false;
export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  if (syncing) return { ok: 0, fail: 0 };
  syncing = true;
  const q = readQueue();
  if (q.length === 0) { syncing = false; return { ok: 0, fail: 0 }; }
  let ok = 0, fail = 0;
  const remaining: QueuedOp[] = [];
  for (const op of q) {
    try {
      const { error } = await supabase.from(op.table).insert(op.payload);
      if (error) { fail++; remaining.push(op); } else { ok++; }
    } catch {
      fail++; remaining.push(op);
    }
  }
  writeQueue(remaining);
  syncing = false;
  if (ok > 0) toast.success(`${ok} registro(s) sincronizados`);
  if (fail > 0) toast.error(`${fail} registro(s) falharam na sincronização`);
  return { ok, fail };
}

export function initOfflineSync() {
  if (typeof window === "undefined") return;
  const tryFlush = () => { if (navigator.onLine) void flushQueue(); };
  window.addEventListener("online", tryFlush);
  // initial attempt
  setTimeout(tryFlush, 1500);
}

export function useQueueSize() {
  // Lightweight subscription via custom event
  if (typeof window === "undefined") return 0;
  return readQueue().length;
}
