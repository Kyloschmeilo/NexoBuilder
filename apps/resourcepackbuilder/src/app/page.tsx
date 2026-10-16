'use client';
import dynamic from 'next/dynamic';

// The app relies on IndexedDB, the DOM and the desktop bridge, so it is never prerendered.
const Root = dynamic(() => import('../shell/Root'), { ssr: false });

export default function Page() {
  return <Root />;
}
