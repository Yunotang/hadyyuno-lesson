/// <reference types="vite/client" />
import { useState } from 'react';
import React from 'react';
import { Modal } from './Modal';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { loginWithGoogle, auth } from '../lib/firebase';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordModal({ isOpen, onClose, onSuccess }: PasswordModalProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      await loginWithGoogle();
      if (auth.currentUser) {
        onSuccess();
        onClose();
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    }
    setLoading(false);
  };

  // 關閉時清空狀態
  const handleClose = () => {
    setError(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="管理系統登入">
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border border-[var(--c-accent)]/20 bg-[var(--c-accent)]/5 flex items-center justify-center mb-6 text-[var(--c-accent)]">
            <ShieldCheck size={28} className="translate-x-[1px]" />
          </div>
          <p className="text-[var(--c-text-muted)] text-sm font-medium">請使用 Google 帳號登入以啟用雲端同步與編輯權限</p>
        </div>
        
        <div>
          <div className="h-4 mt-2">
            {error && <p className="text-red-500 text-xs text-center animate-in fade-in slide-in-from-top-1 font-medium">登入失敗，請確認您的帳號權限或網路狀態</p>}
          </div>
        </div>
        
        <button onClick={handleLogin} disabled={loading} className="w-full py-3 mt-2 bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-sm flex justify-center items-center gap-2">
          {loading ? '驗證中...' : '使用 Google 帳號登入'}
        </button>
      </div>
    </Modal>
  );
}
