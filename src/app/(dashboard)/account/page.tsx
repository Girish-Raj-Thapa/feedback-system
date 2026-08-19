import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UpdatePasswordForm } from '@/components/account/UpdatePasswordForm';
import { DeleteAccount } from '@/components/account/DeleteAccount';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="p-6 lg:p-9 max-w-4xl space-y-9">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Account Settings
        </h1>
        <p className="text-ink-muted">
          Manage your account details and security settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Info */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-1">
              Email Address
            </h3>
            <p className="text-lg font-medium text-ink">{user.email}</p>
          </div>
          <div className="text-sm text-ink-subtle">
            Logged in via Supabase Auth
          </div>
        </div>

        {/* Security Settings */}
        <UpdatePasswordForm />

        <hr className="border-border-subtle my-8" />

        {/* Danger Zone */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
