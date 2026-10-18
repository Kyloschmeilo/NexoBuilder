import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project';
import {
  availableProperties,
  type FormSchema,
  propertyConflict,
  type PropertyDef,
  type PropertyGroup,
  propertyYamlPath,
} from '@resourcepackbuilder/core/form';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@resourcepackbuilder/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@resourcepackbuilder/ui/components/popover';
import { addProperty } from '../../../commands/items';
import { useOpenProject } from '../../../store/project';
import { useSchemaText } from '../../../components/useSchemaText';
import { PremiumBadge } from './PremiumBadge';
import { VersionBadges } from './VersionBadges';

/** Search matches when the label, description or YAML path contains the query (the keywords hold them). */
function matchesQuery(_value: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLowerCase();
  return !query || keywords.some((keyword) => keyword.toLowerCase().includes(query)) ? 1 : 0;
}

/**
 * "Add" with a searchable list of the group's properties (those in `only`, if given) the item does not use yet.
 * `onAdd` replaces adding by id, for properties that are not in the form (e.g. the settings of a block state variant).
 */
export function AddPropertyButton({
  schema,
  item,
  group,
  only,
  onAdd,
}: {
  schema: FormSchema;
  item: Item;
  group: PropertyGroup;
  only?: string[];
  onAdd?: (def: PropertyDef) => void;
}) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const tSchema = useSchemaText();
  const [isOpen, setIsOpen] = useState(false);
  const version = useOpenProject().settings.minecraftVersion;
  const available = availableProperties(schema, item, group).filter((def) => !only || only.includes(def.id));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={<Button size="sm" />}>
        <Plus /> {tCommon('add')}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0 tracking-normal normal-case">
        <Command filter={matchesQuery}>
          <CommandInput autoFocus placeholder={t('properties.searchPlaceholder')} />
          <CommandList className="max-h-[min(60vh,30rem)]">
            <CommandEmpty className="p-2.5 text-left text-xs text-muted-foreground">{t('properties.noneAvailable')}</CommandEmpty>
            {available.map((def) => {
              const label = tSchema(def.label);
              const description = tSchema(def.description);
              const conflict = propertyConflict(schema, item, def);
              return (
                <CommandItem
                  key={def.id}
                  value={def.id}
                  keywords={[label, description, propertyYamlPath(def) ?? def.id]}
                  disabled={!!conflict}
                  onSelect={() => {
                    if (onAdd) onAdd(def);
                    else addProperty(item.id, def.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium">
                      {label}
                      <PremiumBadge def={def} />
                      <VersionBadges def={def} version={version} showBoth />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conflict ? t('properties.conflict', { name: tSchema(conflict.label) }) : description}
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
