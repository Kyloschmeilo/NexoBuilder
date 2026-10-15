import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@resourcepackbuilder/ui/fonts.css';
import '@resourcepackbuilder/ui/styles.css';

export const metadata: Metadata = {
  title: 'ResourcepackBuilder',
  description: 'ResourcepackBuilder – fertige Nexo-Items mit Resourcepack aus Blockbench-Modellen erstellen',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
