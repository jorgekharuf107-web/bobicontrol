import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { flushQueue, queueSize } from "@/lib/offline-queue";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ConnectionIndicator() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const upd = () => setPending(queueSize());
    upd();
    window.addEventListener("bobi:queue-change", upd);
    const t = setInterval(upd, 2000);
    return () => {
      window.removeEventListener("bobi:queue-change", upd);
      clearInterval(t);
    };
  }, []);

  // Quando a internet volta: destaca em verde por 3s
  useEffect(() => {
    if (!online) return;
    setJustSynced(true);
    const t = setTimeout(() => setJustSynced(false), 3000);
    return () => clearTimeout(t);
  }, [online]);

  const label = online
    ? "Conectado e sincronizado"
    : "Salvando localmente. Sincroniza quando voltar a internet";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={() => { if (online && pending > 0) void flushQueue(); }}
            className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent"
          >
            {online ? (
              <Cloud
                className={cn(
                  "h-4 w-4 text-green-600",
                  justSynced && "animate-pulse",
                )}
              />
            ) : (
              <CloudOff className="h-4 w-4 text-orange-500" />
            )}
            {pending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-orange-500 text-[9px] leading-[14px] text-white text-center">
                {pending}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
          {pending > 0 ? ` (${pending} pendente(s))` : ""}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
