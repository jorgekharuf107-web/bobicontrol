import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "bobi.pwa.install.dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    // Já instalado (standalone) → não mostrar
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-lg border bg-card p-3 shadow-lg sm:left-auto sm:right-4 sm:bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">Instalar o Bobi Control</p>
          <p className="text-xs text-muted-foreground">
            Instale o app para abrir pelo ícone e usar mesmo sem internet.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="rounded-md p-1 hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button size="sm" className="mt-2 w-full" onClick={install}>
        <Download className="mr-2 h-4 w-4" /> Instalar App
      </Button>
    </div>
  );
}
