import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimOps · Simulation Training Operations',
  description: 'Manage simulation scenarios, follow live training sessions and review performance outcomes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
