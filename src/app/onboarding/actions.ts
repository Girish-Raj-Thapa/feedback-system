'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Select plan → create subscription only (no project)
// ─────────────────────────────────────────────────────────────────────────────
export async function setupAccount(plan: 'free' | 'pro') {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  const { error: setupError } = await supabase.rpc('setup_new_user_account', {
    p_plan: plan,
  });

  if (setupError) {
    console.error('Setup error:', setupError);
    return { success: false, error: setupError.message };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Create project with real user data
// ─────────────────────────────────────────────────────────────────────────────
export async function createOnboardingProject(data: {
  websiteUrl: string;
  widgetText?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  // Derive a project name from the URL hostname
  let projectName = 'My Project';
  try {
    const url = new URL(
      data.websiteUrl.startsWith('http')
        ? data.websiteUrl
        : `https://${data.websiteUrl}`,
    );
    projectName = url.hostname.replace(/^www\./, '');
  } catch {
    // keep default
  }

  const projectPayload = {
    user_id: user.id,
    name: projectName,
    website_url: data.websiteUrl.startsWith('http')
      ? data.websiteUrl
      : `https://${data.websiteUrl}`,
    widget_text: data.widgetText?.trim() || 'Feedback',
  };

  // Check if they already have a project
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let project, error;

  if (existing) {
    // Update existing project
    const res = await supabase
      .from('projects')
      .update(projectPayload)
      .eq('id', existing.id)
      .select()
      .single();
    project = res.data;
    error = res.error;
  } else {
    // Insert new project
    const res = await supabase
      .from('projects')
      .insert({
        ...projectPayload,
        widget_position: 'bottom-right',
        widget_color: '#000000',
        widget_theme: 'light',
        widget_border_radius: '16px',
        widget_icon: 'chat',
        widget_title: 'Send Feedback',
      })
      .select()
      .single();
    project = res.data;
    error = res.error;
  }

  if (error) {
    console.error('Create/Update project error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, project };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Poll for first feedback — returns true if any feedback exists
// ─────────────────────────────────────────────────────────────────────────────
export async function pollFirstFeedback(
  projectId: string,
  expectedMessage: string,
): Promise<{
  hasData: boolean;
  feedback?: {
    id: string;
    message: string;
    email: string | null;
    browser: string | null;
    os: string | null;
    device_type: string | null;
    page_url: string | null;
    created_at: string;
  };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { hasData: false };

  const { data, error } = await supabase
    .from('feedback')
    .select(
      'id, message, email, browser, os, device_type, page_url, created_at, status',
    )
    .eq('project_id', projectId)
    .ilike('message', `%${expectedMessage}%`)
    .ilike('email', 'test@feedbackflow.app')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { hasData: false };

  // Automatically archive (resolve) the test feedback so it doesn't clutter the user's dashboard
  if (data.status === 'open') {
    await supabase
      .from('feedback')
      .update({ status: 'resolved' })
      .eq('id', data.id);
  }

  return { hasData: true, feedback: data };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch current onboarding state for the user (subscriptions & projects)
// ─────────────────────────────────────────────────────────────────────────────
export async function getOnboardingState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Check if they have a project
  const { data: project } = await supabase
    .from('projects')
    .select(
      'id, website_url, public_key, widget_text, installation_verified_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (project) {
    return {
      success: true,
      hasProject: true,
      project,
      userId: user.id,
      email: user.email,
    };
  }

  // 2. Check if they have a subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (sub) {
    return {
      success: true,
      hasProject: false,
      hasSubscription: true,
      plan: sub.plan,
      userId: user.id,
      email: user.email,
    };
  }

  return {
    success: true,
    hasProject: false,
    hasSubscription: false,
    userId: user.id,
    email: user.email,
  };
}
