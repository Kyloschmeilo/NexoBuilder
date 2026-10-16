import { useTranslations } from 'next-intl';
import { Tip } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { hexToNexoColor, nexoColorToHex } from '../values';

/** Colour picker for a Nexo colour value "R, G, B". */
export function ColorInput({ value, onChange }: { value: string | undefined; onChange: (value: string) => void }) {
  const t = useTranslations('editor');
  return (
    <Tip label={t('inputs.pickColor')}>
      <Input
        type="color"
        value={nexoColorToHex(value)}
        aria-label={t('inputs.pickColor')}
        className="h-8 w-10 flex-none cursor-pointer p-0.5"
        onChange={(e) => onChange(hexToNexoColor(e.target.value))}
      />
    </Tip>
  );
}
