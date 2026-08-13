-- Add expanded widget settings columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS widget_border_radius TEXT DEFAULT '16px',
ADD COLUMN IF NOT EXISTS widget_icon TEXT DEFAULT 'chat',
ADD COLUMN IF NOT EXISTS widget_title TEXT DEFAULT 'Send Feedback';
