import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_EMAIL = `test-pwd-${Date.now()}@example.com`;
const TEST_PASSWORD = 'SecurePassword123!';
const NEW_PASSWORD = 'NewSecurePassword456!';

async function run() {
  console.log('--- Testing /api/account/password ---');

  const { data: userData } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  
  if (!userData.user) throw new Error('Failed to create user');
  const userId = userData.user.id;

  const { data: authData } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const accessToken = authData.session?.access_token;
  if (!accessToken) throw new Error('Failed to sign in');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const makeRequest = async (token: string, current: string, next: string) => {
    return fetch(`${appUrl}/api/account/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: current,
        newPassword: next,
      })
    });
  };

  // Test 1: Incorrect password
  console.log('\\n[1] Testing incorrect password...');
  const res1 = await makeRequest(accessToken, 'WrongPassword!', NEW_PASSWORD);
  console.log(`Status: ${res1.status}, Body: ${await res1.text()}`);

  // Test 2: Correct password
  console.log('\\n[2] Testing correct password...');
  const res2 = await makeRequest(accessToken, TEST_PASSWORD, NEW_PASSWORD);
  console.log(`Status: ${res2.status}, Body: ${await res2.text()}`);

  // Test 3: Rate limit trigger
  console.log('\\n[3] Spamming endpoint to trigger rate limit...');
  let rateLimited = false;
  
  const { data: newAuthData } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: NEW_PASSWORD,
  });
  const newAccessToken = newAuthData.session?.access_token;
  if (!newAccessToken) throw new Error('Failed to sign in with new password');

  for (let i = 0; i < 20; i++) {
    const res = await makeRequest(newAccessToken, 'WrongPassword!', 'AnotherPassword!');
    if (res.status === 429) {
      console.log(`Request ${i+1}: Status ${res.status} (Rate limited!) - Body: ${await res.text()}`);
      rateLimited = true;
      break;
    } else {
      console.log(`Request ${i+1}: Status ${res.status}`);
    }
  }

  if (!rateLimited) {
    console.log('WARNING: Rate limit was not triggered after 20 requests.');
  }

  // Cleanup
  await admin.auth.admin.deleteUser(userId);
}

run().catch(console.error);
