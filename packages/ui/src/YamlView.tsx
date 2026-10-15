import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

/** Einfache Syntax-Hervorhebung für YAML (nur zur Anzeige). */
function highlightLine(line: string, key: number): ReactNode {
  if (/^\s*#/.test(line)) return <span key={key} className="y-comment">{line}</span>;
  const m = /^(\s*)(- )?([^\s"'#][^:#]*?|"[^"]*"|'[^']*')(:)(\s|$)(.*)$/.exec(line);
  if (m) {
    const [, indent, dash, k, colon, space, rest] = m;
    return (
      <span key={key}>
        {indent}
        {dash && <span className="y-dash">{dash}</span>}
        <span className="y-key">{k}</span>
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
        <span className="y-dash">{d[2]}</span>
        {highlightValue(d[3])}
      </span>
    );
  }
  return <span key={key}>{line}</span>;
}

function highlightValue(value: string): ReactNode {
  if (!value) return null;
  if (/^(true|false)$/.test(value)) return <span className="y-bool">{value}</span>;
  if (/^-?\d+(\.\d+)?$/.test(value)) return <span className="y-num">{value}</span>;
  if (/^(\{\}|\[\])$/.test(value)) return <span className="y-dash">{value}</span>;
  return <span className="y-str">{value}</span>;
}

export function YamlView({ text, maxHeight }: { text: string; maxHeight?: number | string }) {
  const lines = text.split('\n');
  return (
    <pre className="code" style={{ maxHeight }}>
      {lines.map((line, i) => (
        <span key={i}>
          {highlightLine(line, i)}
          {i < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </pre>
  );
}

export function CopyButton({ text, label = 'Kopieren' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* Zwischenablage nicht verfügbar */
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Kopiert' : label}
    </button>
  );
}
