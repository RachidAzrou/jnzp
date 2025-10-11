-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily cleanup of completed tasks (every day at 3 AM)
SELECT cron.schedule(
  'cleanup-completed-tasks-daily',
  '0 3 * * *', -- Daily at 3 AM
  $$
  SELECT
    net.http_post(
        url:='https://yupqrawkrpyfrdzxssdk.supabase.co/functions/v1/cleanup-completed-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cHFyYXdrcnB5ZnJkenhzc2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTcxNzcsImV4cCI6MjA3NDkzMzE3N30.oTIy7KlKLRYgsOOiJWKXMR1uihvig77LE6xYa4Wg1cw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);