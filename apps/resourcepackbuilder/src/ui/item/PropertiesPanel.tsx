import { useMemo, useRef, useState } from 'react';
import { ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import type { ConfigValue, Item } from '@resourcepackbuilder/core/types';
import { getPath } from '@resourcepackbuilder/core/nexo/configPath';
import { PROPERTIES, PROPERTY_GROUPS, type PropertyDef, type PropertyGroup } from '@resourcepackbuilder/core/nexo/schema';
import { compareVersions } from '@resourcepackbuilder/core/util';
import { addProperty, removeProperty, setItemConfigValue } from '../../state/actions';
import { useStore } from '../../state/store';
import { MenuItem, Popover } from '@resourcepackbuilder/ui';
import { FieldRenderer } from '@resourcepackbuilder/ui';

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
  const active = PROPERTIES.filter((p) => groups.includes(p.group) && isPropertyActive(item, p));
  return (
    <div>
      <div className="section-title">
        <span>{title ?? 'Eigenschaften'}</span>
        <span className="spacer" />
        <AddPropertyButton item={item} groups={groups} />
      </div>
      {active.length === 0 && (
        <div className="card">
          <div className="card-body faint small" style={{ textAlign: 'center', padding: 22 }}>
            {emptyText ?? 'Noch nichts hinzugefügt.'} Über <strong>„Hinzufügen“</strong> kannst du Eigenschaften auswählen.
          </div>
        </div>
      )}
      {active.map((def) => (
        <PropertyCard key={def.id} item={item} def={def} />
      ))}
    </div>
  );
}

function versionBadge(def: PropertyDef, version: string) {
  if (def.maxVersion && compareVersions(version, def.maxVersion) > 0) {
    return <span className="badge danger">bis {def.maxVersion}</span>;
  }
  if (def.minVersion) {
    const tooLow = compareVersions(version, def.minVersion) < 0;
    return <span className={`badge ${tooLow ? 'warning' : ''}`}>ab {def.minVersion}</span>;
  }
  return null;
}

function PropertyCard({ item, def }: { item: Item; def: PropertyDef }) {
  const version = useStore((s) => s.project?.settings.minecraftVersion ?? '');
  const value = getPath(item.config, def.path);
  const tooLow = def.minVersion && compareVersions(version, def.minVersion) < 0;
  const tooHigh = def.maxVersion && compareVersions(version, def.maxVersion) > 0;
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="row">
            <h3>{def.label}</h3>
            {versionBadge(def, version)}
            <span className="badge mono" title="Pfad im YAML">
              {def.path.filter((p) => !p.startsWith('$')).join('.') || 'ResourcepackBuilder'}
            </span>
          </div>
          <div className="desc">{def.description}</div>
        </div>
        {def.docs && (
          <a className="btn ghost icon small" href={def.docs} target="_blank" rel="noreferrer" title="Nexo-Dokumentation">
            <ExternalLink size={14} />
          </a>
        )}
        <button className="btn ghost icon small danger" title="Eigenschaft entfernen" onClick={() => removeProperty(item.id, def.id)}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="card-body">
        {(tooLow || tooHigh) && (
          <div className="hint warning">
            {tooLow
              ? `Diese Eigenschaft benötigt Minecraft ${def.minVersion} oder neuer. Dein Projekt ist auf ${version} eingestellt.`
              : `Diese Eigenschaft gibt es nur bis Minecraft ${def.maxVersion}.`}
          </div>
        )}
        {def.hint && <div className="hint">{def.hint}</div>}
        <FieldRenderer
          field={def.field}
          value={value}
          root
          hideLabel={def.field.type !== 'object'}
          onChange={(v) => setItemConfigValue(item.id, def.path, v === undefined ? emptyValueFor(def) : (v as ConfigValue))}
        />
      </div>
    </div>
  );
}

function AddPropertyButton({ item, groups }: { item: Item; groups: PropertyGroup[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchor = useRef<HTMLButtonElement>(null);
  const version = useStore((s) => s.project?.settings.minecraftVersion ?? '');

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROPERTIES.filter(
      (p) =>
        groups.includes(p.group) &&
        !isPropertyActive(item, p) &&
        (!q || p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.path.join('.').toLowerCase().includes(q)),
    );
  }, [groups, item, query]);

  const conflictOf = (def: PropertyDef) =>
    def.conflicts?.map((id) => PROPERTIES.find((p) => p.id === id)).find((p) => p && isPropertyActive(item, p));

  return (
    <>
      <button ref={anchor} className="btn small primary" onClick={() => setOpen((o) => !o)}>
        <Plus size={14} /> Hinzufügen
      </button>
      <Popover anchor={anchor.current} open={open} onClose={() => setOpen(false)} align="right" width={420}>
        <div className="row" style={{ position: 'relative', padding: 4 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, color: 'var(--ink-faint)' }} />
          <input
            className="input"
            style={{ paddingLeft: 28 }}
            autoFocus
            placeholder="Suchen …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {groups.map((group) => {
          const list = available.filter((p) => p.group === group);
          if (list.length === 0) return null;
          return (
            <div key={group}>
              {groups.length > 1 && <div className="menu-group-label">{PROPERTY_GROUPS.find((g) => g.id === group)?.label}</div>}
              {list.map((def) => {
                const conflict = conflictOf(def);
                const tooLow = def.minVersion && compareVersions(version, def.minVersion) < 0;
                const tooHigh = def.maxVersion && compareVersions(version, def.maxVersion) > 0;
                return (
                  <MenuItem
                    key={def.id}
                    disabled={!!conflict}
                    label={
                      <span className="row" style={{ gap: 6 }}>
                        {def.label}
                        {def.minVersion && <span className={`badge ${tooLow ? 'warning' : ''}`}>ab {def.minVersion}</span>}
                        {def.maxVersion && <span className={`badge ${tooHigh ? 'danger' : ''}`}>bis {def.maxVersion}</span>}
                      </span>
                    }
                    description={conflict ? `Nicht zusammen mit „${conflict.label}“ möglich.` : def.description}
                    onClick={() => {
                      addProperty(item.id, def.id);
                      setOpen(false);
                      setQuery('');
                    }}
                  />
                );
              })}
            </div>
          );
        })}
        {available.length === 0 && <div className="faint small" style={{ padding: 10 }}>Keine weiteren Eigenschaften verfügbar.</div>}
      </Popover>
    </>
  );
}
