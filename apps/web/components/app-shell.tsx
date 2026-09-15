'use client';

import { Activity, ClipboardCheck, LayoutGrid, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutGrid },
  { href: '/scenarios', label: 'Scenarios', icon: Activity },
  { href: '/review', label: 'Reviews', icon: ClipboardCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="app-frame">
      <header className="site-header">
        <Link className="wordmark" href="/" onClick={() => setOpen(false)}>
          <span className="wordmark-shape" aria-hidden="true" />
          <span>SimOps</span>
        </Link>

        <button className="menu-button" onClick={() => setOpen(value => !value)} aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={open ? 'main-nav open' : 'main-nav'}>
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                className={active(item.href) ? 'nav-link active' : 'nav-link'}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="page-shell">{children}</main>
      <footer className="site-footer">SimOps · Simulation training operations</footer>
    </div>
  );
}
