import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { Logo } from '@/components/ui/Logo';
import { SidebarNav } from '@/components/layout/SidebarNav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has a project. If not, force onboarding.
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!project) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen bg-bg-secondary overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-subtle bg-bg-primary flex flex-col hidden md:flex">
        {/* Brand Header */}
        <Link 
          href="/dashboard"
          title="Back to user dashboard"
          className="p-6 border-b border-border-subtle flex items-center gap-2 hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <Logo />
          <h2 className="text-lg font-semibold text-ink tracking-tight">
            FeedbackFlow
          </h2>
        </Link>

        {/* Navigation */}
        <SidebarNav />

        {/* Footer actions */}
        <div className="p-4 border-t border-border-subtle">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-bg-secondary">{children}</main>
    </div>
  );
}
