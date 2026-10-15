'use client';
import dynamic from 'next/dynamic';

// The app relies on IndexedDB, the DOM and the Electron bridge, so it is never prerendered.
export const ClientApp = dynamic(() => import('./Boot'), { ssr: false });
