import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { themeInitScript } from '../theme/theme-script';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResourcepackBuilder',
  description: 'ResourcepackBuilder – build ready-to-use Nexo items with a resource pack from Blockbench models',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // `lang` and the `dark` class are set on the client: the language by I18nProvider, the theme by the inline script before first paint.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
