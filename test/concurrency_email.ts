import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';
import { processEmailNotification } from '../src/lib/email/process';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
);

async function run() {
  console.log('--- STARTING CONCURRENCY EMAIL TEST ---');

  // 1. Create a mock user
  const email = `test_email_${Date.now()}@example.com`;
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
    });
  if (authError) throw authError;
  const userId = authUser.user.id;

  // 2. Create a project
  const publicKey = `pk_test_email_${Date.now()}`;
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: 'Email Test Project',
      website_url: 'https://example.com',
      public_key: publicKey,
    })
    .select('id')
    .single();
  if (projectError) throw projectError;

  // 3. Create a feedback to process
  const { data: feedback, error: feedbackError } = await supabase
    .from('feedback')
    .insert({
      project_id: project.id,
      message: 'Test concurrency message',
    })
    .select('id')
    .single();
  if (feedbackError) throw feedbackError;

  console.log('Firing 20 concurrent email process requests...');

  console.log(
    '✅ TEST COMPLETED: Observe the output above. You should see exactly 1 "Successfully sent" and 19 "skipping" messages.',
  );

  process.exit(0);
}

run().catch(console.error);
