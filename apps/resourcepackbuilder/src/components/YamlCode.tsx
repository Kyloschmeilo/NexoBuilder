import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockLine,
} from '@resourcepackbuilder/ui/components/code-block';
import { useHighlightedCode } from '@resourcepackbuilder/ui/hooks/use-highlighted-code';

/**
 * Read-only YAML, highlighted by shiki (plain text until the highlighter has loaded), with a copy button.
 * `className` can limit the height (e.g. `max-h-96`); the code scrolls inside.
 */
export function YamlCode({ text, className }: { text: string; className?: string }) {
  const tCommon = useTranslations('common');
  const tUi = useTranslations('ui');
  const lines = useHighlightedCode(text, 'yaml');
  return (
    <CodeBlock size="sm" className={cn('bg-surface-sunken dark:bg-surface-sunken [tab-size:2]', className)}>
      <CodeBlockActions>
        <CodeBlockCopyButton value={text} label={tCommon('copy')} copiedLabel={tUi('copyButton.copied')} />
      </CodeBlockActions>
      <CodeBlockContent className="leading-5">
        {lines.map((line, i) => (
          <CodeBlockLine key={i}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}
