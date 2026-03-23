
-- Level 1: Tighten the Workflow - All schema changes
ALTER TABLE trips ADD COLUMN IF NOT EXISTS readiness_score jsonb DEFAULT '{}';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS upgrade_notes text;
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS video_intro_url text;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS expected_commission numeric DEFAULT 0;
