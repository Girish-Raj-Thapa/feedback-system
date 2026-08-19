import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountRateLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;

    const {
      data: { user },
      error: sessionError,
    } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    console.log('API Route session error:', sessionError?.message);

    if (sessionError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      (request as any).ip ||
      'unknown-ip';
    const rateLimitId = `account_pwd_${user.id}_${ip}`;

    const limitResult = await accountRateLimiter.limit(rateLimitId);
    if (!limitResult.success) {
      logger.warn('Rate limit exceeded for password update', { userId: user.id, ip });
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = passwordUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    // 4. Re-authenticate using the current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      logger.warn('Failed re-authentication during password update', { userId: user.id });
      return NextResponse.json(
        { error: 'Incorrect current password' },
        { status: 403 }
      );
    }

    // 5. Update to the new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      logger.error('Failed to update password', { userId: user.id }, updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    logger.info('User password successfully updated', { userId: user.id });
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('Unexpected error during password update', undefined, error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
