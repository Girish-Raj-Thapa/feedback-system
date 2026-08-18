import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';
import { getMonthlyFeedbackCount } from '../src/lib/usage';

// Mock system time to August 15, 2026 UTC to ensure we are clearly in "August" UTC
const originalDate = Date;
class MockDate extends Date {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super('2026-08-15T12:00:00Z');
    } else {
      // @ts-ignore
      super(...args);
    }
  }
}
// Apply mock only for new Date() calls without args
global.Date = new Proxy(Date, {
  construct(target, args) {
    if (args.length === 0) return new MockDate();
    // @ts-ignore
    return new target(...args);
  },
}) as any;

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
);

async function run() {
  console.log('--- STARTING TIMEZONE BOUNDARY TEST ---');
  console.log('Current TZ environment variable:', process.env.TZ);
  console.log('Local time reported by Date:', new originalDate().toString());

  // 1. Create a mock user
  const email = `test_tz_${Date.now()}@example.com`;
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
    });
  if (authError) throw authError;
  const userId = authUser.user.id;

  // 2. Create a project
  const publicKey = `pk_test_tz_${Date.now()}`;
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: 'Timezone Test Project',
      website_url: 'https://example.com',
      public_key: publicKey,
    })
    .select('id')
    .single();
  if (projectError) throw projectError;

  // 3. Insert feedback in July (UTC)
  // July 31st 23:30 UTC
  // In America/Los_Angeles (PDT, UTC-7), this is July 31st 16:30.
  const { error: errorJul } = await supabase.from('feedback').insert({
    project_id: project.id,
    message: 'July feedback',
    created_at: '2026-07-31T23:30:00Z',
  });
  if (errorJul) throw errorJul;

  // 4. Insert feedback in August (UTC)
  // August 1st 00:30 UTC
  // In America/Los_Angeles (PDT, UTC-7), this is July 31st 17:30!! (Still July locally!)
  const { error: errorAug } = await supabase.from('feedback').insert({
    project_id: project.id,
    message: 'August feedback',
    created_at: '2026-08-01T00:30:00Z',
  });
  if (errorAug) throw errorAug;

  // 5. Query usage (should query for "Current Month" = August UTC)
  console.log('Calling getMonthlyFeedbackCount...');
  const count = await getMonthlyFeedbackCount(userId);

  console.log(`Returned count for August: ${count}`);

  if (count === 1) {
    console.log(
      '✅ TEST PASSED: Timezone boundary correctly respected UTC boundaries.',
    );
  } else {
    console.error(
      `❌ TEST FAILED: Expected exactly 1 (the August 1st UTC one), but got ${count}.`,
    );
    process.exit(1);
  }

  process.exit(0);
}

run().catch(console.error);
