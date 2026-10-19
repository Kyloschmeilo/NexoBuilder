/**
 * A resource id (`namespace:path`): a mono text input plus a picker button that lists the open project's items,
 * models, textures and sounds with search. Picking one writes its id; typing any other id stays possible (vanilla ids,
 * other plugins' resources).
 */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderSearch } from 'lucide-react';
import { Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@resourcepackbuilder/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@resourcepackbuilder/ui/components/popover';
import { useProjectStore } from '../../../store/project';
import type { Choice } from './choices';
import { projectResourceIds, RESOURCE_GROUPS } from './resourceIds';
import { TextInput } from './TextInput';

interface ResourceIdInputProps {
  id?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  suggestions?: readonly Choice[];
  invalid?: boolean;
}

/** Search matches when the id or the name contains the query. */
function matchesQuery(_value: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLowerCase();
  return !query || keywords.some((keyword) => keyword.toLowerCase().includes(query)) ? 1 : 0;
}

/** A `namespace:path` input with a picker of the project's resources. */
export function ResourceIdInput({ id, value, onChange, placeholder, suggestions, invalid }: ResourceIdInputProps) {
  const t = useTranslations('editor');
  const project = useProjectStore((s) => s.project);
  const [isOpen, setIsOpen] = useState(false);
  // Only computed while the picker is open: the list walks every item of the project
  const ids = useMemo(() => (isOpen && project ? projectResourceIds(project) : []), [isOpen, project]);
  return (
    <div data-slot="resource-id" className="flex min-w-0 items-start gap-1.5">
      <TextInput
        id={id}
        className="min-w-0 flex-1"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        suggestions={suggestions}
        invalid={invalid}
        mono
      />
      {project && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <Tip label={t('inputs.pickResource')}>
            <PopoverTrigger render={<Button type="button" variant="outline" size="icon" aria-label={t('inputs.pickResource')} />}>
              <FolderSearch />
            </PopoverTrigger>
          </Tip>
          <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
            <Command filter={matchesQuery}>
              <CommandInput autoFocus placeholder={t('inputs.searchResources')} />
              <CommandList className="max-h-[min(60vh,24rem)]">
                <CommandEmpty className="p-2.5 text-left text-meta text-text-muted">{t('inputs.noResources')}</CommandEmpty>
                {RESOURCE_GROUPS.map((group) => {
                  const entries = ids.filter((entry) => entry.group === group);
                  if (entries.length === 0) return null;
                  return (
                    <CommandGroup key={group} heading={t(`inputs.resourceGroups.${group}`)}>
                      {entries.map((entry) => (
                        <CommandItem
                          key={`${group}:${entry.id}`}
                          value={`${group}:${entry.id}`}
                          keywords={[entry.id, entry.label ?? '']}
                          onSelect={() => {
                            onChange(entry.id);
                            setIsOpen(false);
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-meta">{entry.id}</span>
                          {entry.label && <span className="max-w-[40%] min-w-0 truncate text-meta text-text-muted">{entry.label}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
