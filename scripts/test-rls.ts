import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Use the local development Supabase instance
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'; // Normally we'd load this from .env.local
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY || 'your-service-role-key';

// Initialize the admin client to bypass RLS and create test data
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTests() {
  console.log('--- Starting RLS Security Tests ---');

  // 1. Setup Test Users
  console.log('Setting up test users (User A, User B)...');

  const emailA = `test-user-a-${Date.now()}@example.com`;
  const emailB = `test-user-b-${Date.now()}@example.com`;
  const password = 'testpassword123';

  // Create User A
  const { data: userAData, error: userAError } =
    await adminClient.auth.admin.createUser({
      email: emailA,
      password: password,
      email_confirm: true,
    });
  if (userAError)
    throw new Error(`Failed to create User A: ${userAError.message}`);
  const userA = userAData.user;

  // Create User B
  const { data: userBData, error: userBError } =
    await adminClient.auth.admin.createUser({
      email: emailB,
      password: password,
      email_confirm: true,
    });
  if (userBError)
    throw new Error(`Failed to create User B: ${userBError.message}`);
  const userB = userBData.user;

  console.log(`User A created: ${userA.id}`);
  console.log(`User B created: ${userB.id}`);

  // 2. Provision Data using the setup_new_user_account RPC
  // Since we are creating them via admin, we'll manually insert their default projects
  // using admin client to ensure they exist.

  const { data: projectA, error: pAError } = await adminClient
    .from('projects')
    .insert({
      user_id: userA.id,
      name: 'Project A',
      website_url: 'https://site-a.com',
    })
    .select()
    .single();
  if (pAError)
    throw new Error(`Failed to create Project A: ${pAError.message}`);

  const { data: projectB, error: pBError } = await adminClient
    .from('projects')
    .insert({
      user_id: userB.id,
      name: 'Project B',
      website_url: 'https://site-b.com',
    })
    .select()
    .single();
  if (pBError)
    throw new Error(`Failed to create Project B: ${pBError.message}`);

  // Insert feedback for B
  await adminClient.from('feedback').insert({
    project_id: projectB.id,
    message: 'Feedback for B',
  });

  // 3. Authenticate clients (Impersonation)
  console.log('Authenticating regular clients...');

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await clientA.auth.signInWithPassword({ email: emailA, password });

  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await clientB.auth.signInWithPassword({ email: emailB, password });

  // --- RUN RLS TESTS ---
  console.log('\n--- Running Assertions ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      testsFailed++;
    }
  }

  // Test 1: User A should see exactly 1 project (their own)
  const { data: aProjects } = await clientA.from('projects').select('*');
  assert(
    aProjects?.length === 1 && aProjects[0].id === projectA.id,
    'User A can only select their own project',
  );

  // Test 2: User A attempts to read User B's project by ID
  const { data: bProjectReadByA } = await clientA
    .from('projects')
    .select('*')
    .eq('id', projectB.id);
  assert(
    bProjectReadByA?.length === 0,
    'User A cannot read User B project directly by ID',
  );

  // Test 3: User A attempts to update User B's project
  const { data: bProjectUpdateByA, error: updateError } = await clientA
    .from('projects')
    .update({ name: 'Hacked by A' })
    .eq('id', projectB.id)
    .select();

  // Note: RLS update failures usually just result in 0 rows updated, not necessarily an error object, unless strict Mode.
  assert(
    bProjectUpdateByA?.length === 0,
    'User A cannot update User B project',
  );

  // Test 4: User A attempts to read User B's feedback
  const { data: bFeedbackReadByA } = await clientA
    .from('feedback')
    .select('*')
    .eq('project_id', projectB.id);
  assert(bFeedbackReadByA?.length === 0, 'User A cannot read User B feedback');

  // Test 5: User A attempts to delete User B's project
  const { data: bProjectDeleteByA } = await clientA
    .from('projects')
    .delete()
    .eq('id', projectB.id)
    .select();
  assert(
    bProjectDeleteByA?.length === 0,
    'User A cannot delete User B project',
  );

  // 4. Cleanup
  console.log('\nCleaning up test data...');
  await adminClient.auth.admin.deleteUser(userA.id);
  await adminClient.auth.admin.deleteUser(userB.id);

  console.log('\n--- Test Summary ---');
  console.log(`Total Passed: ${testsPassed}`);
  console.log(`Total Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Check if running directly
if (require.main === module) {
  // If the env vars aren't set, this will fail. Warn the user.
  if (
    !process.env.SUPABASE_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.warn(
      '⚠️  WARNING: SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.',
    );
    console.warn(
      'Run this script using: npx dotenv -e .env.local -- npx tsx scripts/test-rls.ts',
    );
  }

  runTests().catch((err) => {
    console.error('Fatal Error during tests:', err);
    process.exit(1);
  });
}
