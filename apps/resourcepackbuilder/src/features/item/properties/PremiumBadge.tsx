import { useTranslations } from 'next-intl';
import type { PropertyDef } from '@resourcepackbuilder/core/form';
import { Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';

/** "Premium" badge of a property that only the paid edition of the plugin reads. */
export function PremiumBadge({ def }: { def: PropertyDef }) {
  const t = useTranslations('item');
  if (def.badge !== 'premium') return null;
  return (
    <Tip label={t('properties.premiumHint')}>
      <Badge variant="info">{t('properties.premium')}</Badge>
    </Tip>
  );
}
