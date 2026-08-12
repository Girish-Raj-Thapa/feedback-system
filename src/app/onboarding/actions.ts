'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function setupAccount(plan: 'free' | 'pro') {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  // Atomically create subscription and default project via secure Database RPC
  const { error: setupError } = await supabase.rpc('setup_new_user_account', {
    p_plan: plan,
  });

  if (setupError) {
    console.error('Setup error:', setupError);
    return { success: false, error: setupError.message };
  }

  // Clear the Next.js cache so layout.tsx fetches the fresh project
  revalidatePath('/', 'layout');

  return { success: true };
}
