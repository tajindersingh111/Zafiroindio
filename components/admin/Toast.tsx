"use client";

interface Toast { id: string; message: string; type: "success" | "error" | "warning" | "info"; }

const toastStyles = {
  success: { bar: "bg-green-600", icon: "text-green-600" },
  error:   { bar: "bg-madder",    icon: "text-madder" },
  warning: { bar: "bg-turmeric",  icon: "text-[#8a6519]" },
  info:    { bar: "bg-indigo",    icon: "text-indigo" },
};

const toastIcons = {
  success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>,
  error:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>,
  warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>,
  info:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
};

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((t) => {
        const s = toastStyles[t.type];
        return (
          <div key={t.id} className="bg-cream-card border border-stone/30 rounded-sm shadow-xl overflow-hidden flex pointer-events-auto">
            <div className={`w-1 shrink-0 ${s.bar}`} />
            <div className="flex items-start gap-3 p-4 flex-1">
              <svg className={`w-4 h-4 mt-0.5 shrink-0 ${s.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{toastIcons[t.type]}</svg>
              <p className="text-sm text-ink flex-1">{t.message}</p>
              <button onClick={() => onRemove(t.id)} className="text-stone hover:text-ink shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
