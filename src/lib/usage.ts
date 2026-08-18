import { createAdminClient } from './supabase/admin';
import { logger } from './logger';

/**
 * Returns the total number of feedback submissions for a user across all their projects
 * in the current calendar month.
 */
export async function getMonthlyFeedbackCount(userId: string): Promise<number> {
  const admin = createAdminClient();
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  try {
    // 1. Get all projects for this user
    const { data: projects, error: projectsError } = await admin
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) return 0;

    const projectIds = projects.map((p) => p.id);

    // 2. Count feedback for these projects in the current month
    const { count, error: countError } = await admin
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .gte('created_at', startOfMonth.toISOString());

    if (countError) throw countError;

    return count || 0;
  } catch (error) {
    logger.error(
      'Failed to calculate monthly feedback count',
      { userId },
      error as Error,
    );
    // We fail open (return 0) so an intermittent DB timeout doesn't break widget rendering.
    // The logger will still alert us.
    return 0;
  }
}
