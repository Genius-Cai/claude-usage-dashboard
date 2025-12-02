import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { AppLayout } from '@/components/layout/app-layout';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Application metadata for SEO and PWA
 */
export const metadata: Metadata = {
  title: {
    default: 'Claude Code Usage Dashboard',
    template: '%s | Claude Usage',
  },
  description:
    'Real-time monitoring dashboard for Claude Code usage, costs, and session analytics',
  keywords: [
    'Claude',
    'Claude Code',
    'AI',
    'Usage',
    'Dashboard',
    'Analytics',
    'Token',
    'Cost',
  ],
  authors: [{ name: 'Claude Usage Dashboard' }],
  creator: 'Claude Usage Dashboard',
  publisher: 'Claude Usage Dashboard',
  applicationName: 'Claude Usage Dashboard',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Claude Usage',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Claude Usage Dashboard',
    title: 'Claude Code Usage Dashboard',
    description: 'Real-time monitoring for Claude Code usage and costs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claude Code Usage Dashboard',
    description: 'Real-time monitoring for Claude Code usage and costs',
  },
};

/**
 * Viewport configuration for PWA and mobile
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
