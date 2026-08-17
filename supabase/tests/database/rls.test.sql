BEGIN;
create extension if not exists pgtap;

SELECT plan(8);

-- 1. Setup Mock Users
-- We insert two users directly into auth.users. 
-- In Supabase, the auth.users table is in a separate schema.
INSERT INTO auth.users (id, aud, role, email) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'user_a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'user_b@example.com');

-- 2. Setup Mock Data as superuser (bypasses RLS)
INSERT INTO public.projects (id, user_id, name, website_url) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Project A', 'https://a.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Project B', 'https://b.com');

INSERT INTO public.feedback (id, project_id, message) VALUES 
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feedback for A'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Feedback for B');


-- 3. Impersonate User A
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- ==========================================
-- TEST: Visibility
-- ==========================================
SELECT results_eq(
  'SELECT id FROM public.projects',
  $$VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'User A should only see their own project'
);

SELECT results_eq(
  'SELECT id FROM public.feedback',
  $$VALUES ('ffffffff-ffff-ffff-ffff-fffffffffff1'::uuid)$$,
  'User A should only see feedback for their project'
);

-- ==========================================
-- TEST: Prevent Cross-User Mutations (Silent Failures)
-- ==========================================
-- These operations target User B's rows. Because of the USING policy, 
-- they are invisible to User A, so the operations affect 0 rows silently.
UPDATE public.projects SET name = 'Hacked by A' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DELETE FROM public.projects WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
UPDATE public.feedback SET status = 'resolved' WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffff2';
DELETE FROM public.feedback WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffff2';

-- ==========================================
-- TEST: Prevent Reassignment (Exception Thrown)
-- ==========================================
-- These operations target User A's rows but attempt to change the ownership/relationship.
-- They violate the WITH CHECK policy and must throw an error.
SELECT throws_ok(
  $$UPDATE public.projects SET user_id = '22222222-2222-2222-2222-222222222222' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'new row violates row-level security policy for table "projects"',
  'User A cannot reassign their project to another user (Throws error)'
);

SELECT throws_ok(
  $$UPDATE public.feedback SET project_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffff1'$$,
  'new row violates row-level security policy for table "feedback"',
  'User A cannot reassign feedback to another user''s project (Throws error)'
);

-- ==========================================
-- VERIFY: Did the silent mutations fail?
-- ==========================================
-- We switch back to superuser (postgres) to verify User B's data is untouched.
RESET role;
RESET request.jwt.claims;

SELECT results_eq(
  $$SELECT name FROM public.projects WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  $$VALUES ('Project B'::text)$$,
  'User A could not update Project B'
);

SELECT results_eq(
  $$SELECT count(*)::integer FROM public.projects WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  $$VALUES (1::integer)$$,
  'User A could not delete Project B'
);

SELECT results_eq(
  $$SELECT status::text FROM public.feedback WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffff2'$$,
  $$VALUES ('open'::text)$$,
  'User A could not update Feedback B'
);

SELECT results_eq(
  $$SELECT count(*)::integer FROM public.feedback WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffff2'$$,
  $$VALUES (1::integer)$$,
  'User A could not delete Feedback B'
);

SELECT * FROM finish();
ROLLBACK;
