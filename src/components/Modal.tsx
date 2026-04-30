import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidthClass = "max-w-xl" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`bg-white shadow-2xl border-2 border-[var(--c-border)] rounded-3xl w-full ${maxWidthClass} p-8 relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-6 right-6 text-[var(--c-text-muted)] hover:text-slate-900 hover:bg-slate-100 transition-colors p-2 rounded-xl border border-transparent hover:border-slate-300">
          <X size={20} className="stroke-[3px]" />
        </button>
        <h2 className="text-2xl font-black mb-6 text-[var(--c-text)] border-b-2 border-dashed border-[var(--c-border)] pb-4">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
