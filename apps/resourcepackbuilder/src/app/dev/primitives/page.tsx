'use client';
/**
 * The hidden `/dev/primitives` route that shows every editor primitive (see `src/dev/Primitives.tsx`). It renders only
 * under `next dev`; in the exported app the route stays empty.
 */
import dynamic from 'next/dynamic';

const Primitives = dynamic(() => import('../../../dev/Primitives'), { ssr: false });

export default function PrimitivesRoute() {
  return process.env.NODE_ENV === 'development' ? <Primitives /> : null;
}
