import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from './components/button';

const CONFIRMATION_MS = 1500;

/** Copies `text` to the clipboard and confirms it briefly; `label` defaults to the common "Copy". */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useTranslations('ui');
  const tCommon = useTranslations('common');
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
      {isCopied ? t('copyButton.copied') : (label ?? tCommon('copy'))}
    </Button>
  );
}
