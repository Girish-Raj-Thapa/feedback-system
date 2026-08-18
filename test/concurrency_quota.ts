import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
);

async function run() {
  console.log('--- STARTING CONCURRENCY QUOTA TEST ---');

  // 1. Create a mock user
  const email = `test_quota_${Date.now()}@example.com`;
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
    });
  if (authError) throw authError;
  const userId = authUser.user.id;

  // 2. Create a project
  const publicKey = `pk_test_${Date.now()}`;
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: 'Quota Test Project',
      website_url: 'https://example.com',
      public_key: publicKey,
    })
    .select('id')
    .single();
  if (projectError) throw projectError;

  // 3. Set up the subscription (Free)
  const { error: subError } = await supabase.from('subscriptions').insert({
    user_id: userId,
    plan: 'free',
  });
  if (subError) throw subError;

  // 4. Pre-fill 48 feedbacks
  console.log('Pre-filling 48 feedbacks...');
  const feedbacks = Array.from({ length: 48 }).map(() => ({
    project_id: project.id,
    message: 'Pre-fill message',
  }));
  await supabase.from('feedback').insert(feedbacks);

  // 5. Fire 20 concurrent requests against the API route
  console.log('Firing 20 concurrent feedback API requests...');

  const appUrl = 'http://localhost:3000';

  const promises = Array.from({ length: 20 }).map((_, i) =>
    fetch(`${appUrl}/api/widget/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.com',
        'X-Forwarded-For': `192.168.1.${i}`,
      },
      body: JSON.stringify({
        public_key: publicKey,
        message: `Concurrent message ${i}`,
      }),
    }),
  );

  const results = await Promise.all(promises);
  const statuses = results.map((r) => r.status);

  const successes = statuses.filter((s) => s === 201).length;
  const failures = statuses.filter((s) => s === 402).length;

  console.log(
    `Results: ${successes} Success, ${failures} Quota Exceeded, ${statuses.length - successes - failures} Other`,
  );

  // 6. Verify final DB count
  const { count } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id);

  console.log(`Final Database Count: ${count}`);

  if (successes === 2 && count === 50) {
    console.log(
      '✅ TEST PASSED: Free plan race condition successfully prevented.',
    );
  } else {
    console.error('❌ TEST FAILED: Concurrency allowed quota bypass.');
    process.exit(1);
  }

  // 7. Test Pro Plan (Should allow unlimited)
  console.log('\n--- TESTING PRO PLAN BPYASS ---');
  await supabase
    .from('subscriptions')
    .update({ plan: 'pro' })
    .eq('user_id', userId);

  console.log('Firing 60 concurrent feedback API requests on PRO plan...');
  const proPromises = Array.from({ length: 60 }).map((_, i) =>
    fetch(`${appUrl}/api/widget/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.com',
        'X-Forwarded-For': `10.0.0.${i}`,
      },
      body: JSON.stringify({
        public_key: publicKey,
        message: `Pro message ${i}`,
      }),
    }),
  );

  const proResults = await Promise.all(proPromises);
  const proStatuses = proResults.map((r) => r.status);
  const proSuccesses = proStatuses.filter((s) => s === 201).length;

  const { count: proCount } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id);

  console.log(`Pro Results: ${proSuccesses} Success out of 60`);
  console.log(`Final Database Count for Pro: ${proCount}`);

  if (proSuccesses === 60 && proCount === 110) {
    console.log('✅ TEST PASSED: Pro plan correctly bypasses quota.');
  } else {
    console.error('❌ TEST FAILED: Pro plan was incorrectly throttled.');
    process.exit(1);
  }

  process.exit(0);
}

run().catch(console.error);
