import React from 'react';
import { useStore } from '../context/StoreContext';

export const ToastHost: React.FC = () => {
  const { toast } = useStore();

  if (!toast) return null;

  const toneClasses =
    toast.tone === 'error'
      ? 'bg-red-950 text-white border-red-800'
      : toast.tone === 'success'
        ? 'bg-emerald-950 text-white border-emerald-800'
        : 'bg-zinc-900 text-white border-zinc-700';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-sm ${toneClasses}`}
    >
      {toast.message}
    </div>
  );
};
