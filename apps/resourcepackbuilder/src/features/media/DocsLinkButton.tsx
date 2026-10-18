/** An icon button that opens a page of the plugin documentation in the browser. */
import { ExternalLink } from 'lucide-react';
import { IconButton } from '@resourcepackbuilder/ui';

export function DocsLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <IconButton label={label} nativeButton={false} render={<a href={href} target="_blank" rel="noreferrer" />}>
      <ExternalLink />
    </IconButton>
  );
}
