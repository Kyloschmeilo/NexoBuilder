import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import type { ConfigValue, Item } from '@resourcepackbuilder/core/types';
import { getPath } from '@resourcepackbuilder/core/nexo/configPath';
import { PROPERTIES, PROPERTY_GROUPS, type PropertyDef, type PropertyGroup } from '@resourcepackbuilder/core/nexo/schema';
import { compareVersions } from '@resourcepackbuilder/core/util';
import { addProperty, removeProperty, setItemConfigValue } from '../../state/actions';
import { useStore } from '../../state/store';
import { FieldRenderer } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@resourcepackbuilder/ui/components/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@resourcepackbuilder/ui/components/popover';
import { EditorCard, EmptyCard, Hint, SectionTitle, Tip } from './parts';

function emptyValueFor(def: PropertyDef): ConfigValue {
  switch (def.field.type) {
    case 'object':
    case 'map':
    case 'presence':
      return {};
    case 'objectList':
    case 'stringList':
    case 'multiSelect':
      return [];
    default:
      return null;
  }
}

export function isPropertyActive(item: Item, def: PropertyDef): boolean {
  return getPath(item.config, def.path) !== undefined;
}

export function countActiveProperties(item: Item, group: PropertyGroup): number {
  return PROPERTIES.filter((p) => p.group === group && isPropertyActive(item, p)).length;
}

interface PropertiesPanelProps {
  item: Item;
  groups: PropertyGroup[];
  title?: string;
  emptyText?: string;
}

export function PropertiesPanel({ item, groups, title, emptyText }: PropertiesPanelProps) {
  const t = useTranslations('item');
  const active = PROPERTIES.filter((p) => groups.includes(p.group) && isPropertyActive(item, p));
  return (
    <div>
      <SectionTitle actions={<AddPropertyButton item={item} groups={groups} />}>{title ?? t('properties.defaultTitle')}</SectionTitle>
      {active.length === 0 && (
        <EmptyCard>
          {t.rich('properties.emptyHint', {
            text: emptyText ?? t('properties.defaultEmpty'),
            b: (chunks) => <strong>{chunks}</strong>,
          })}
        </EmptyCard>
      )}
      {active.map((def) => (
        <PropertyCard key={def.id} item={item} def={def} />
      ))}
    </div>
  );
}

/** "from 1.21.4" / "until 1.21.3" badges, coloured when the project's version is outside the range. */
function VersionBadges({ def, version, both }: { def: PropertyDef; version: string; both?: boolean }) {
  const t = useTranslations('item');
  const tooLow = !!def.minVersion && compareVersions(version, def.minVersion) < 0;
  const tooHigh = !!def.maxVersion && compareVersions(version, def.maxVersion) > 0;
  const max = def.maxVersion && (both || tooHigh) && (
    <Badge variant={tooHigh ? 'destructive' : 'outline'}>{t('properties.untilVersion', { version: def.maxVersion })}</Badge>
  );
  const min = def.minVersion && (both || !max) && (
    <Badge variant="outline" className={tooLow ? 'border-warning text-warning' : undefined}>
      {t('properties.fromVersion', { version: def.minVersion })}
    </Badge>
  );
  return (
    <>
      {min}
      {max}
    </>
  );
}

function PropertyCard({ item, def }: { item: Item; def: PropertyDef }) {
  const t = useTranslations('item');
  const ts = useTranslations('schema');
  const version = useStore((s) => s.project?.settings.minecraftVersion ?? '');
  const value = getPath(item.config, def.path);
  const tooLow = def.minVersion && compareVersions(version, def.minVersion) < 0;
  const tooHigh = def.maxVersion && compareVersions(version, def.maxVersion) > 0;
  return (
    <EditorCard
      title={ts(def.label as never)}
      badges={
        <>
          <VersionBadges def={def} version={version} />
          <Tip label={t('properties.pathInYaml')}>
            <Badge variant="outline" className="font-mono">
              {def.path.filter((p) => !p.startsWith('$')).join('.') || 'ResourcepackBuilder'}
            </Badge>
          </Tip>
        </>
      }
      description={ts(def.description as never)}
      actions={
        <>
          {def.docs && (
            <Tip label={t('properties.docs')}>
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                aria-label={t('properties.docs')}
                render={<a href={def.docs} target="_blank" rel="noreferrer" />}
              >
                <ExternalLink />
              </Button>
            </Tip>
          )}
          <Tip label={t('properties.remove')}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={t('properties.remove')}
              onClick={() => removeProperty(item.id, def.id)}
            >
              <Trash2 />
            </Button>
          </Tip>
        </>
      }
    >
      {(tooLow || tooHigh) && (
        <Hint warning>
          {tooLow ? t('properties.tooLow', { min: def.minVersion!, version }) : t('properties.tooHigh', { max: def.maxVersion! })}
        </Hint>
      )}
      {def.hint && <Hint>{ts(def.hint as never)}</Hint>}
      <FieldRenderer
        field={def.field}
        value={value}
        root
        hideLabel={def.field.type !== 'object'}
        onChange={(v) => setItemConfigValue(item.id, def.path, v === undefined ? emptyValueFor(def) : (v as ConfigValue))}
      />
    </EditorCard>
  );
}

function AddPropertyButton({ item, groups }: { item: Item; groups: PropertyGroup[] }) {
  const t = useTranslations('item');
  const tc = useTranslations('common');
  const ts = useTranslations('schema');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const version = useStore((s) => s.project?.settings.minecraftVersion ?? '');

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROPERTIES.filter(
      (p) =>
        groups.includes(p.group) &&
        !isPropertyActive(item, p) &&
        (!q ||
          ts(p.label as never).toLowerCase().includes(q) ||
          ts(p.description as never).toLowerCase().includes(q) ||
          p.path.join('.').toLowerCase().includes(q)),
    );
  }, [groups, item, query, ts]);

  const conflictOf = (def: PropertyDef) =>
    def.conflicts?.map((id) => PROPERTIES.find((p) => p.id === id)).find((p) => p && isPropertyActive(item, p));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger render={<Button size="sm" />}>
        <Plus /> {tc('add')}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] gap-1 p-1 normal-case tracking-normal">
        <div className="p-1">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput autoFocus placeholder={t('properties.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </InputGroup>
        </div>
        <div className="max-h-[min(60vh,480px)] overflow-y-auto">
          {groups.map((group) => {
            const list = available.filter((p) => p.group === group);
            if (list.length === 0) return null;
            const groupLabel = PROPERTY_GROUPS.find((g) => g.id === group)?.label;
            return (
              <div key={group} className="flex flex-col">
                {groups.length > 1 && groupLabel && (
                  <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{ts(groupLabel as never)}</div>
                )}
                {list.map((def) => {
                  const conflict = conflictOf(def);
                  return (
                    <button
                      key={def.id}
                      type="button"
                      disabled={!!conflict}
                      className="flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => {
                        addProperty(item.id, def.id);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {ts(def.label as never)}
                        <VersionBadges def={def} version={version} both />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conflict ? t('properties.conflict', { name: ts(conflict.label as never) }) : ts(def.description as never)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {available.length === 0 && <div className="p-2.5 text-xs text-muted-foreground">{t('properties.noneAvailable')}</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
