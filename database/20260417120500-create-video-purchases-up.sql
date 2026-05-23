-- Create video_purchases table for match video paywall
BEGIN;
CREATE TABLE IF NOT EXISTS video_purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'usd',
  payment_intent_id VARCHAR(255),
  payment_status VARCHAR(50),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_purchases_user_match ON video_purchases(user_id, match_id);
COMMIT;
