import { useTranslations } from 'next-intl';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { ConfigValue, Item } from '@resourcepackbuilder/core/project/types';
import { toConfigValue } from '@resourcepackbuilder/core/project/configValue';
import { getPropertyValue } from '@resourcepackbuilder/core/nexo/properties';
import type { PropertyDef } from '@resourcepackbuilder/core/nexo/schema';
import { versionSupport } from '@resourcepackbuilder/core/minecraft/versions';
import { IconButton, SectionCard, Tip } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { removeProperty, setItemProperty } from '../../../commands/items';
import { FieldRenderer } from '../../../components/editor';
import { useOpenProject } from '../../../store/project';
import { VersionBadges } from './VersionBadges';

/** The value a property keeps when its editor is cleared: the property stays on the item until it is removed. */
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

function PropertyHints({ def, version }: { def: PropertyDef; version: string }) {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  const support = versionSupport(version, def);
  return (
    <>
      {support === 'tooOld' && (
        <Alert variant="warning">
          <AlertDescription>{t('properties.tooLow', { min: def.minVersion ?? '', version })}</AlertDescription>
        </Alert>
      )}
      {support === 'removed' && (
        <Alert variant="warning">
          <AlertDescription>{t('properties.tooHigh', { max: def.maxVersion ?? '' })}</AlertDescription>
        </Alert>
      )}
      {def.hint && (
        <Alert variant="info">
          <AlertDescription>{tSchema(def.hint as never)}</AlertDescription>
        </Alert>
      )}
    </>
  );
}

/** One property of an item: its editor with version hints, YAML path, docs link and remove button. */
export function PropertyCard({ item, def }: { item: Item; def: PropertyDef }) {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  const version = useOpenProject().settings.minecraftVersion;
  return (
    <SectionCard
      title={tSchema(def.label as never)}
      badges={
        <>
          <VersionBadges def={def} version={version} />
          <Tip label={t('properties.pathInYaml')}>
            <Badge variant="outline" className="font-mono">
              {def.storage === 'config' ? def.path.join('.') : 'ResourcepackBuilder'}
            </Badge>
          </Tip>
        </>
      }
      description={tSchema(def.description as never)}
      actions={
        <>
          {def.docs && (
            <IconButton label={t('properties.docs')} nativeButton={false} render={<a href={def.docs} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          )}
          <IconButton label={t('properties.remove')} variant="ghost-destructive" onClick={() => removeProperty(item.id, def.id)}>
            <Trash2 />
          </IconButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <PropertyHints def={def} version={version} />
        <FieldRenderer
          field={def.field}
          value={getPropertyValue(item, def)}
          root
          hideLabel={def.field.type !== 'object'}
          onChange={(value) => setItemProperty(item.id, def, toConfigValue(value) ?? emptyValueFor(def))}
        />
      </div>
    </SectionCard>
  );
}
