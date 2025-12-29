import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claude Code - Web Edition',
  description: 'Web-based coding assistant powered by Claude',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning data-theme="linear">
      <body className="overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
