import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = {
  isMobile: boolean;
  desktopOpen: boolean;
  mobileOpen: boolean;
  toggleDesktop: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "bobicontrol.sidebar.desktopOpen";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const on = () => setIsMobile(mql.matches);
    on();
    mql.addEventListener("change", on);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setDesktopOpen(stored === "1");
    return () => mql.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, desktopOpen ? "1" : "0");
  }, [desktopOpen]);

  return (
    <SidebarCtx.Provider
      value={{
        isMobile,
        desktopOpen,
        mobileOpen,
        toggleDesktop: () => setDesktopOpen((v) => !v),
        toggleMobile: () => setMobileOpen((v) => !v),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </SidebarCtx.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
