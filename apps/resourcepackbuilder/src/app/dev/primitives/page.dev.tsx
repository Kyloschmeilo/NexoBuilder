'use client';
/**
 * The hidden `/dev/primitives` route that shows every editor primitive (see `src/dev/Primitives.tsx`). The `.dev.tsx`
 * extension is a page extension only outside production (`next.config.ts`), so `next build` neither exports the route
 * nor bundles the page.
 */
import dynamic from 'next/dynamic';

const Primitives = dynamic(() => import('../../../dev/Primitives'), { ssr: false });

export default function PrimitivesRoute() {
  return <Primitives />;
}
