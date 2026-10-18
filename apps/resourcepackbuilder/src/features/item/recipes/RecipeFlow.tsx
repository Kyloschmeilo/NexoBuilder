/**
 * The station of a recipe drawn as a line of slots: what goes in (the smithing template, base and addition, the
 * brewing bottle and ingredient, the anvil's input and material …) joined by "+", an arrow, and the result with its
 * amount. It mirrors the slot fields below it, so it is hidden from screen readers; only the result amount is a
 * control.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Plus } from 'lucide-react';
import { cn } from '@resourcepackbuilder/ui/cn';
import { MAX_RESULT_AMOUNT } from '@resourcepackbuilder/core/project';
import { NumberInput } from '../../../components/editor';

/** One slot of the line: its name and the item in it (null while empty). */
export interface FlowSlot {
  label: string;
  value: string | null;
}

const TILE = 'flex min-w-0 flex-col gap-0.5 rounded-lg border px-2.5 py-1.5';

/** A slot tile: its name above the item (or "empty"). */
function FlowTile({ slot, emptyText }: { slot: FlowSlot; emptyText: string }) {
  return (
    <div className={cn(TILE, 'max-w-44 border-line bg-surface-sunken', !slot.value && 'border-dashed')}>
      <span className="truncate text-micro text-text-muted">{slot.label}</span>
      <span className={cn('truncate font-mono text-meta', slot.value ? 'text-text' : 'text-text-faint')}>{slot.value ?? emptyText}</span>
    </div>
  );
}

interface ResultTileProps {
  amount: number;
  itemId: string;
  onAmountChange: (amount: number) => void;
}

/** The result of a recipe: the amount it makes (editable) and the item's id. */
export function ResultTile({ amount, itemId, onAmountChange }: ResultTileProps) {
  const t = useTranslations('item');
  return (
    <div data-slot="recipe-result" className={cn(TILE, 'border-primary/40 bg-primary/5')}>
      <span className="truncate text-micro text-text-muted">{t('recipes.resultLabel')}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <NumberInput
          className="w-16"
          label={t('recipes.resultAmount')}
          value={amount}
          integer
          min={1}
          max={MAX_RESULT_AMOUNT}
          onChange={(next) => onAmountChange(next ?? 1)}
        />
        <span className="min-w-0 truncate font-mono text-meta text-text">× {itemId}</span>
      </div>
    </div>
  );
}

/** A faint operator between tiles. */
function Operator({ children }: { children: ReactNode }) {
  return <span className="grid flex-none place-items-center text-text-faint [&_svg]:size-4">{children}</span>;
}

/** The line of slots, then an arrow and the result (left out for recipes that change the base item instead). */
export function RecipeFlow({ slots, result }: { slots: readonly FlowSlot[]; result?: ReactNode }) {
  const t = useTranslations('item');
  return (
    <div data-slot="recipe-flow" className="flex min-w-0 flex-wrap items-center gap-2">
      {slots.map((slot, index) => (
        <div key={slot.label} className="flex min-w-0 items-center gap-2" aria-hidden>
          {index > 0 && (
            <Operator>
              <Plus />
            </Operator>
          )}
          <FlowTile slot={slot} emptyText={t('recipes.summary.empty')} />
        </div>
      ))}
      {result && (
        <>
          <Operator>
            <ArrowRight aria-hidden />
          </Operator>
          {result}
        </>
      )}
    </div>
  );
}
