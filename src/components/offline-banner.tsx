import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { flushQueue, queueSize } from "@/lib/offline-queue";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const upd = () => setPending(queueSize());
    upd();
    window.addEventListener("bobi:queue-change", upd);
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    const t = setInterval(upd, 2000);
    return () => {
      window.removeEventListener("bobi:queue-change", upd);
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
      clearInterval(t);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`w-full text-xs px-3 py-1.5 flex items-center justify-center gap-2 ${
        online ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900"
      }`}
      role="status"
    >
      <CloudOff className="h-3.5 w-3.5" />
      {online ? (
        <>
          <span>{pending} registro(s) pendentes de sincronização</span>
          <button
            onClick={() => void flushQueue()}
            className="inline-flex items-center gap-1 underline font-medium"
          >
            <RefreshCw className="h-3 w-3" /> Sincronizar agora
          </button>
        </>
      ) : (
        <span>
          Modo Offline — suas movimentações serão salvas localmente e enviadas quando a conexão voltar
          {pending > 0 ? ` (${pending} na fila)` : ""}
        </span>
      )}
    </div>
  );
}
