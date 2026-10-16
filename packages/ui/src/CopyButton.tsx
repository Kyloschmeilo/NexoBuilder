import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './components/button';

const CONFIRMATION_MS = 1500;

interface CopyButtonProps {
  text: string;
  /** Button text, e.g. "Copy". */
  label: string;
  /** Shown briefly after copying, e.g. "Copied". */
  copiedLabel: string;
}

/** Copies `text` to the clipboard and confirms it briefly. */
export function CopyButton({ text, label, copiedLabel }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // Clipboard not available (e.g. denied permission): nothing to confirm
    }
    setIsCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIsCopied(false), CONFIRMATION_MS);
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {isCopied ? <Check /> : <Copy />}
      {isCopied ? copiedLabel : label}
    </Button>
  );
}
