import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Req = {
  title: string;
  description?: string;
  confirmLabel?: string;
  resolve: (v: boolean) => void;
};

let push: ((r: Req) => void) | null = null;

/** Confirmação padrão do app (substitui window.confirm). */
export function confirmar(title: string, options?: { description?: string; confirmLabel?: string }) {
  return new Promise<boolean>((resolve) => {
    if (!push) return resolve(false);
    push({ title, description: options?.description, confirmLabel: options?.confirmLabel, resolve });
  });
}

/** Atalho: "Excluir este {item}?" */
export function confirmarExclusao(item: string) {
  return confirmar(`Excluir este ${item}?`, { confirmLabel: "Excluir" });
}

export function ConfirmDialogHost() {
  const [req, setReq] = useState<Req | null>(null);

  useEffect(() => {
    push = (r) => setReq(r);
    return () => { push = null; };
  }, []);

  function close(value: boolean) {
    req?.resolve(value);
    setReq(null);
  }

  return (
    <AlertDialog open={!!req} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{req?.title}</AlertDialogTitle>
          {req?.description && <AlertDialogDescription>{req.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>{req?.confirmLabel ?? "Confirmar"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
