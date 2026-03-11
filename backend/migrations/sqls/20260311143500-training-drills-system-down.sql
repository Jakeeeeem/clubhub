-- ============================================================
--  Training & Drills System - DOWN Migration
-- ============================================================

DROP TABLE IF EXISTS player_skill_scores CASCADE;
DROP TABLE IF EXISTS drill_reviews CASCADE;
DROP TABLE IF EXISTS drill_submissions CASCADE;
DROP TABLE IF EXISTS drill_assignments CASCADE;
DROP TABLE IF EXISTS drills CASCADE;
