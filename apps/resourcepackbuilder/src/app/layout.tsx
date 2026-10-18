import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { COLOR_THEME_BOOT_SCRIPT } from '../theme/colorThemes';
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
  // `lang`, the `dark` class and `data-color-theme` are set on the client: the language by I18nProvider, light or dark
  // by next-themes' inline script ('theme' in localStorage: 'light', 'dark' or 'system') and the colour theme by the
  // boot script in the head ('colorTheme' in localStorage), both before first paint.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme" disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
