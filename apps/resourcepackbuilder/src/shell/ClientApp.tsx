'use client';
import dynamic from 'next/dynamic';

// The app relies on IndexedDB, the DOM and the desktop bridge, so it is never prerendered.
export const ClientApp = dynamic(() => import('./Root'), { ssr: false });
