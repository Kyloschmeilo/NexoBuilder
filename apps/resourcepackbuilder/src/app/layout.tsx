import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
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
  // `lang` and the `dark` class are set on the client: the language by I18nProvider, the theme by next-themes' inline
  // script before first paint ('theme' in localStorage: 'light', 'dark' or 'system').
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme" disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
