'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  CreditCard,
  User,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarNav() {
  const pathname = usePathname();

  const params = useParams<{ id?: string }>();
  const projectId = params?.id;

  const globalNavItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Account', href: '/account', icon: User },
  ];

  const projectNavItems = projectId
    ? [
        {
          name: 'Project Overview',
          href: `/projects/${projectId}`,
          icon: LayoutDashboard,
          exact: true,
        },
        {
          name: 'Feedbacks',
          href: `/projects/${projectId}/feedbacks`,
          icon: MessageSquare,
        },
        {
          name: 'Installation Guide',
          href: `/projects/${projectId}/installation`,
          icon: Download,
        },
        {
          name: 'Settings & Widget',
          href: `/projects/${projectId}/settings`,
          icon: Settings,
        },
      ]
    : [];

  const navItems = projectId ? projectNavItems : globalNavItems;

  return (
    <nav className="flex-1 px-4 py-6 space-y-3">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-accent-subtle text-accent'
                : 'text-ink hover:bg-bg-secondary',
            )}
          >
            <Icon
              size={18}
              strokeWidth={2}
              className={isActive ? 'text-accent' : 'text-ink-muted'}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
