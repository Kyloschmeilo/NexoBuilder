import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { isPropertyActive } from '@resourcepackbuilder/core/nexo/properties';
import { PROPERTIES, PROPERTY_BY_ID, type PropertyDef, type PropertyGroup } from '@resourcepackbuilder/core/nexo/schema';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@resourcepackbuilder/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@resourcepackbuilder/ui/components/popover';
import { addProperty } from '../../../commands/items';
import { useOpenProject } from '../../../store/project';
import { VersionBadges } from './VersionBadges';

/** Search matches when the label, description or YAML path contains the query (the keywords hold them). */
function matchesQuery(_value: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLowerCase();
  return !query || keywords.some((keyword) => keyword.toLowerCase().includes(query)) ? 1 : 0;
}

/** An active property that cannot be combined with `def`, if any. */
function conflictOf(item: Item, def: PropertyDef): PropertyDef | undefined {
  return def.conflicts?.map((id) => PROPERTY_BY_ID.get(id)).find((other): other is PropertyDef => !!other && isPropertyActive(item, other));
}

/** "Add" with a searchable list of the group's properties the item does not use yet. */
export function AddPropertyButton({ item, group }: { item: Item; group: PropertyGroup }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const tSchema = useTranslations('schema');
  const [open, setOpen] = useState(false);
  const version = useOpenProject().settings.minecraftVersion;
  const available = PROPERTIES.filter((p) => p.group === group && !isPropertyActive(item, p));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" />}>
        <Plus /> {tCommon('add')}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0 tracking-normal normal-case">
        <Command filter={matchesQuery}>
          <CommandInput autoFocus placeholder={t('properties.searchPlaceholder')} />
          <CommandList className="max-h-[min(60vh,30rem)]">
            <CommandEmpty className="p-2.5 text-left text-xs text-muted-foreground">{t('properties.noneAvailable')}</CommandEmpty>
            {available.map((def) => {
              const label = tSchema(def.label as never);
              const description = tSchema(def.description as never);
              const conflict = conflictOf(item, def);
              return (
                <CommandItem
                  key={def.id}
                  value={def.id}
                  keywords={[label, description, def.storage === 'config' ? def.path.join('.') : def.id]}
                  disabled={!!conflict}
                  onSelect={() => {
                    addProperty(item.id, def.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium">
                      {label}
                      <VersionBadges def={def} version={version} both />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conflict ? t('properties.conflict', { name: tSchema(conflict.label as never) }) : description}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
