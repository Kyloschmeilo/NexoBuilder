/** Read-only YAML with simple syntax highlighting. */
import type { ReactNode } from 'react';
import { cn } from 'cn';

const KEY_LINE = /^(\s*)(- )?([^\s"'#][^:#]*?|"[^"]*"|'[^']*')(:)(\s|$)(.*)$/;
const LIST_LINE = /^(\s*)(- )(.*)$/;

function highlightValue(value: string): ReactNode {
  if (!value) return null;
  if (/^(true|false)$/.test(value)) return <span className="text-primary">{value}</span>;
  if (/^-?\d+(\.\d+)?$/.test(value)) return <span className="text-warning">{value}</span>;
  if (/^(\{\}|\[\])$/.test(value)) return <span className="text-muted-foreground">{value}</span>;
  return <span className="text-foreground">{value}</span>;
}

function highlightLine(line: string): ReactNode {
  if (/^\s*#/.test(line)) return <span className="text-muted-foreground italic">{line}</span>;
  const keyed = KEY_LINE.exec(line);
  if (keyed) {
    const [, indent, dash, key, colon, space, rest] = keyed;
    return (
      <>
        {indent}
        {dash && <span className="text-muted-foreground">{dash}</span>}
        <span className="text-info">{key}</span>
        {colon}
        {space}
        {highlightValue(rest)}
      </>
    );
  }
  const listed = LIST_LINE.exec(line);
  if (listed) {
    return (
      <>
        {listed[1]}
        <span className="text-muted-foreground">{listed[2]}</span>
        {highlightValue(listed[3])}
      </>
    );
  }
  return line;
}

/** `className` can limit the height (e.g. `max-h-96`); the view scrolls inside. */
export function YamlView({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <pre
      className={cn(
        'm-0 overflow-auto rounded-md border border-border bg-background px-4 py-3 font-mono text-xs leading-5 whitespace-pre text-muted-foreground [tab-size:2]',
        className,
      )}
    >
      {lines.map((line, i) => (
        <span key={i}>
          {highlightLine(line)}
          {i < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </pre>
  );
}
