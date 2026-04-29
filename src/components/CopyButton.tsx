import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 w-8 h-8 rounded-md bg-white border border-[var(--c-border)] text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:border-[var(--c-accent)] transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--c-accent-light)] shadow-sm"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-[var(--c-accent)]" /> : <Copy size={14} />}
    </button>
  );
}
