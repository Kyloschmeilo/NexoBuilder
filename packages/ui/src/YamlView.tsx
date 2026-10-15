import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from './components/button';

/** Simple syntax highlighting for YAML (display only). */
function highlightLine(line: string, key: number): ReactNode {
  if (/^\s*#/.test(line)) return <span key={key} className="text-muted-foreground italic">{line}</span>;
  const m = /^(\s*)(- )?([^\s"'#][^:#]*?|"[^"]*"|'[^']*')(:)(\s|$)(.*)$/.exec(line);
  if (m) {
    const [, indent, dash, k, colon, space, rest] = m;
    return (
      <span key={key}>
        {indent}
        {dash && <span className="text-muted-foreground">{dash}</span>}
        <span className="text-info">{k}</span>
        {colon}
        {space}
        {highlightValue(rest)}
      </span>
    );
  }
  const d = /^(\s*)(- )(.*)$/.exec(line);
  if (d) {
    return (
      <span key={key}>
        {d[1]}
        <span className="text-muted-foreground">{d[2]}</span>
        {highlightValue(d[3])}
      </span>
    );
  }
  return <span key={key}>{line}</span>;
}

function highlightValue(value: string): ReactNode {
  if (!value) return null;
  if (/^(true|false)$/.test(value)) return <span className="text-primary">{value}</span>;
  if (/^-?\d+(\.\d+)?$/.test(value)) return <span className="text-warning">{value}</span>;
  if (/^(\{\}|\[\])$/.test(value)) return <span className="text-muted-foreground">{value}</span>;
  return <span className="text-foreground">{value}</span>;
}

export function YamlView({ text, maxHeight }: { text: string; maxHeight?: number | string }) {
  const lines = text.split('\n');
  return (
    <pre className="m-0 overflow-auto rounded-md border border-border bg-background px-4 py-3 font-mono text-xs leading-5 whitespace-pre text-muted-foreground [tab-size:2]" style={{ maxHeight }}>
      {lines.map((line, i) => (
        <span key={i}>
          {highlightLine(line, i)}
          {i < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </pre>
  );
}

/** Copies `text` to the clipboard; `label` defaults to the common "Copy". */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* Clipboard not available */
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? t('copyButton.copied') : (label ?? common('copy'))}
    </Button>
  );
}
