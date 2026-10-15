import { useTranslations } from 'next-intl';
import type { PropertyDef } from '@resourcepackbuilder/core/nexo/schema';
import { versionSupport } from '@resourcepackbuilder/core/minecraft/versions';
import { Badge } from '@resourcepackbuilder/ui/components/badge';

interface VersionBadgesProps {
  def: PropertyDef;
  /** The project's Minecraft version. */
  version: string;
  /** Show both limits; otherwise only the one that matters for `version`. */
  both?: boolean;
}

/** "from 1.21.4" / "until 1.21.3" badges, coloured when the project's version is outside the range. */
export function VersionBadges({ def, version, both }: VersionBadgesProps) {
  const t = useTranslations('item');
  const support = versionSupport(version, def);
  const showMax = !!def.maxVersion && (both || support === 'removed');
  const showMin = !!def.minVersion && (both || !showMax);
  return (
    <>
      {showMin && (
        <Badge variant={support === 'tooOld' ? 'warning' : 'outline'}>
          {t('properties.fromVersion', { version: def.minVersion ?? '' })}
        </Badge>
      )}
      {showMax && (
        <Badge variant={support === 'removed' ? 'destructive' : 'outline'}>
          {t('properties.untilVersion', { version: def.maxVersion ?? '' })}
        </Badge>
      )}
    </>
  );
}
