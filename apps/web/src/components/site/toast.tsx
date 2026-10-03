"use client";

import { createContext, useCallback, useContext, useState } from "react";

const Ctx = createContext<(msg: string) => void>(() => undefined);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { id, msg }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((i) => (
          <div key={i.id} className="toast-in rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-cream shadow-[0_14px_40px_-12px_rgba(0,0,0,.5)]">
            {i.msg}
          </div>
        ))}
      </div>
      <style>{`.toast-in{animation:toastIn .5s cubic-bezier(.16,1,.3,1)}@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </Ctx.Provider>
  );
}
