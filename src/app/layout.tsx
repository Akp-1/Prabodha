import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Prabodha - Institution Management Platform',
  description: 'One platform for institutions: attendance, batches, study material, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

