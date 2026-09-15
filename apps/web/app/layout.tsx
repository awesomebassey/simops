import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SimOps', description: 'Live simulation operations and training telemetry' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
