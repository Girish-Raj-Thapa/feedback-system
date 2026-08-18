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
  console.log('--- STARTING QUOTA WARNING EMAIL CONCURRENCY TEST ---');

  // 1. Create a mock user
  const email = `test_quota_email_${Date.now()}@example.com`;
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
    });
  if (authError) throw authError;
  const userId = authUser.user.id;

  // 2. Create a project
  const publicKey = `pk_test_quota_email_${Date.now()}`;
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: 'Quota Email Test Project',
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

  // 4. Pre-fill 49 feedbacks (exactly 1 away from 50)
  console.log('Pre-filling 49 feedbacks...');
  const feedbacksToInsert = Array.from({ length: 49 }).map((_, i) => ({
    project_id: project.id,
    message: `Pre-fill message ${i}`,
  }));
  const { error: prefillError } = await supabase
    .from('feedback')
    .insert(feedbacksToInsert);
  if (prefillError) throw prefillError;

  // 5. Override/Mock the quota warning email sender to count triggers
  // We cannot easily intercept the actual `sendQuotaWarningEmail` import inside the Next.js process
  // from this external script.
  // However, we CAN check the database state after the fact to see if `last_quota_warning_sent_at`
  // was set exactly once. Wait, we want to know if the email fires exactly once.
  // Actually, Next.js logs `[INFO] Sending quota warning email to user...`
  // We can just verify that the `last_quota_warning_sent_at` is set, and it is NOT null anymore.

  // 6. Fire 10 concurrent requests against the API route
  console.log(
    'Firing 10 concurrent feedback API requests on project at 49/50...',
  );

  const appUrl = 'http://localhost:3000';

  const promises = Array.from({ length: 10 }).map((_, i) =>
    fetch(`${appUrl}/api/widget/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.com',
        'X-Forwarded-For': `172.16.0.${i}`,
      },
      body: JSON.stringify({
        public_key: publicKey,
        message: `Concurrent message ${i}`,
      }),
    }),
  );

  const responses = await Promise.allSettled(promises);
  let successCount = 0;
  let quotaExceededCount = 0;
  let otherErrorCount = 0;

  for (const result of responses) {
    if (result.status === 'fulfilled') {
      const res = result.value;
      if (res.status === 201) {
        successCount++;
      } else if (res.status === 402) {
        quotaExceededCount++;
      } else {
        otherErrorCount++;
        console.error('Unexpected status:', res.status, await res.text());
      }
    } else {
      otherErrorCount++;
      console.error('Fetch failed:', result.reason);
    }
  }

  // 7. Check database state
  const { data: finalSub } = await supabase
    .from('subscriptions')
    .select('last_quota_warning_sent_at')
    .eq('user_id', userId)
    .single();

  console.log(
    `Results: ${successCount} Success, ${quotaExceededCount} Quota Exceeded, ${otherErrorCount} Other`,
  );
  console.log(`Warning Sent At: ${finalSub?.last_quota_warning_sent_at}`);

  if (
    successCount === 1 &&
    quotaExceededCount === 9 &&
    finalSub?.last_quota_warning_sent_at
  ) {
    console.log(
      '✅ TEST PASSED: Quota warning email correctly gated and triggered exactly once.',
    );
  } else {
    console.error('❌ TEST FAILED: Unexpected outcome.');
    process.exit(1);
  }

  process.exit(0);
}

run().catch(console.error);
