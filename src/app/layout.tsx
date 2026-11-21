import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { StoreHydration } from '@/components/layout/StoreHydration';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { THEME_BOOT_SCRIPT } from '@/components/theme/theme';
import { buildMetadata } from '@/lib/metadata';
import './globals.css';

/** Headlines: a wide, heavy grotesk that carries the streetwear voice. */
// Fonts are self-hosted (latin subset, variable) from ./fonts rather than fetched
// from Google at build time, so a Google Fonts hiccup can never fail a deploy.
const archivo = localFont({
  src: './fonts/Archivo-Variable.woff2',
  display: 'swap',
  variable: '--font-archivo',
  weight: '100 900',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }]
});

/** Everything people read and tap: clear at small sizes, friendly at large ones. */
const geist = localFont({
  src: './fonts/Geist-Variable.woff2',
  display: 'swap',
  variable: '--font-geist',
  weight: '100 900'
});

const geistMono = localFont({
  src: './fonts/GeistMono-Variable.woff2',
  display: 'swap',
  variable: '--font-geist-mono',
  weight: '100 900'
});

export const metadata: Metadata = buildMetadata();
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f5f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${archivo.variable} ${geist.variable} ${geistMono.variable}`}
      data-theme="dark"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved or device theme before the first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skipLink" href="#main">
          Skip to main content
        </a>
        <StoreHydration />
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
