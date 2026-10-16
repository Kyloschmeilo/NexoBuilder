import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { VARIANTS } from '@resourcepackbuilder/core/nexo/variants';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { setVariantModels } from '../../../commands/items';
import { Section } from '../../../components/Section';
import { VariantCard } from './VariantCard';

function AddVariantButton({ item }: { item: Item }) {
  const tCommon = useTranslations('common');
  const tSchema = useTranslations('schema');
  const available = VARIANTS.filter((v) => item.variants?.[v.slot] === undefined);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" disabled={available.length === 0} />}>
        <Plus /> {tCommon('add')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-90 max-w-[calc(100vw-2rem)]">
        {available.map((def) => (
          <DropdownMenuItem key={def.slot} className="flex-col items-start gap-0.5" onClick={() => setVariantModels(item.id, def.slot, [])}>
            <span className="font-medium">{tSchema(def.label as never)}</span>
            <span className="text-xs text-muted-foreground">{tSchema(def.description as never)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Nexo's "Special Item Appearance": extra models for states like pulling a bow or blocking with a shield. */
export function VariantsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const active = VARIANTS.filter((v) => item.variants?.[v.slot] !== undefined);
  return (
    <Section
      title={t('variants.title')}
      actions={<AddVariantButton item={item} />}
      empty={active.length === 0 && t.rich('variants.empty', { b: (chunks) => <strong>{chunks}</strong> })}
    >
      {active.map((def) => (
        <VariantCard key={def.slot} item={item} def={def} />
      ))}
    </Section>
  );
}
