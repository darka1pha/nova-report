import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NextReport Studio - Professional Report Designer',
  description: 'Enterprise Visual Report Designer & Reporting Engine Platform'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
