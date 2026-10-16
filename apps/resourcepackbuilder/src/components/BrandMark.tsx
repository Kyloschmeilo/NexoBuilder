import { cn } from 'cn';

const SIZES = {
  sm: 'size-7 text-lg',
  lg: 'size-14 text-3xl',
} as const;

/** The app's "R" mark, as in the app icon. */
export function BrandMark({ size = 'sm', className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-sm bg-primary font-heading leading-none font-bold text-primary-foreground',
        SIZES[size],
        className,
      )}
    >
      R
    </span>
  );
}
