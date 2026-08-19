import { createClient } from '@supabase/supabase-js';

async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Secret Key in environment variables.');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const TEST_EMAIL = 'playwright-e2e@feedbackflow.app';
  const TEST_PASSWORD = 'password123';
  const TEST_PROJECT_KEY = 'fb_pub_playwright_test';

  console.log('Seeding test user and project...');

  // 1. Cleanup any existing test user
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  const existingUser = users.users.find((u) => u.email === TEST_EMAIL);
  if (existingUser) {
    console.log('Found existing test user, deleting...');
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  // 2. Create test user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // 3. Create test project attached to user
  const { data: projectData, error: dbError } = await supabase.from('projects').insert({
    user_id: authData.user.id,
    name: 'E2E Test Project',
    website_url: 'http://localhost:3000',
    public_key: TEST_PROJECT_KEY,
  }).select('id').single();

  if (dbError || !projectData) {
    throw new Error(`Failed to create test project: ${dbError?.message}`);
  }

  // 3.5 Create the default free subscription (required by the quota RPC)
  const { error: subError } = await supabase.from('subscriptions').insert({
    user_id: authData.user.id,
    plan: 'free',
    status: 'active'
  });

  if (subError) {
    throw new Error(`Failed to create test subscription: ${subError.message}`);
  }

  // 4. Create one initial feedback item so dashboard tests have guaranteed data
  const { error: feedbackError } = await supabase.from('feedback').insert({
    project_id: projectData.id,
    message: 'Global setup smoke test message',
    browser: 'Playwright',
    status: 'open',
  });

  if (feedbackError) {
    throw new Error(`Failed to insert test feedback: ${feedbackError.message}`);
  }

  console.log('Successfully provisioned E2E test data.');
}

export default globalSetup;
