/** Text with the parts a search matched marked. */
import { Fragment } from 'react';
import type { MatchRange } from './search';

/** Renders `text` with each range in a `<mark>` (accent, no background box). */
export function Highlight({ text, ranges }: { text: string; ranges: readonly MatchRange[] }) {
  if (!ranges.length) return <>{text}</>;
  const parts: Array<{ text: string; marked: boolean }> = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ text: text.slice(at, start), marked: false });
    parts.push({ text: text.slice(start, end), marked: true });
    at = end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), marked: false });
  return (
    <>
      {parts.map((part, i) =>
        part.marked ? (
          <mark key={i} data-slot="match" className="rounded-[2px] bg-accent-soft px-px font-semibold text-primary">
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
