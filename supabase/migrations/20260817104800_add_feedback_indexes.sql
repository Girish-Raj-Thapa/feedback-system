-- Add indexes for common dashboard query patterns
-- 1. Index on project_id and created_at (descending) for paginated inbox sorting and recent activity queries
CREATE INDEX IF NOT EXISTS idx_feedback_project_created ON feedback (project_id, created_at DESC);

-- 2. Index on project_id and status for analytics aggregation and inbox filtering
CREATE INDEX IF NOT EXISTS idx_feedback_project_status ON feedback (project_id, status);
