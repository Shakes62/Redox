import type { Metadata, Viewport } from 'next';
import { Archivo, Geist, Geist_Mono } from 'next/font/google';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { StoreHydration } from '@/components/layout/StoreHydration';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { THEME_BOOT_SCRIPT } from '@/components/theme/theme';
import { buildMetadata } from '@/lib/metadata';
import './globals.css';

/** Headlines: a wide, heavy grotesk that carries the streetwear voice. */
const archivo = Archivo({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth']
});

/** Everything people read and tap: clear at small sizes, friendly at large ones. */
const geist = Geist({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-geist'
});

const geistMono = Geist_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500', '600']
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
