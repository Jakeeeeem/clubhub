-- ============================================================
--  Training & Drills System - UP Migration
--  ClubHub - 2026-03-11
-- ============================================================

-- 1. Drill Library
CREATE TABLE IF NOT EXISTS drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    demo_video_url TEXT,
    category VARCHAR(100) DEFAULT 'General',
    difficulty VARCHAR(50) DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
    duration_minutes INTEGER DEFAULT 10,
    required_equipment TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drills_org_id ON drills(org_id);
CREATE INDEX IF NOT EXISTS idx_drills_category ON drills(category);
CREATE INDEX IF NOT EXISTS idx_drills_coach_id ON drills(coach_id);

-- 2. Drill Assignments (which players/teams a drill is assigned to)
CREATE TABLE IF NOT EXISTS drill_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    assigned_to_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    assigned_to_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    assigned_by_coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'assigned', -- assigned, completed, overdue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT must_have_target CHECK (
        assigned_to_player_id IS NOT NULL OR assigned_to_team_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_drill_assignments_drill_id ON drill_assignments(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_assignments_player_id ON drill_assignments(assigned_to_player_id);
CREATE INDEX IF NOT EXISTS idx_drill_assignments_team_id ON drill_assignments(assigned_to_team_id);

-- 3. Player Submissions (when a player uploads their drill attempt)
CREATE TABLE IF NOT EXISTS drill_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES drill_assignments(id) ON DELETE SET NULL,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    video_url TEXT,
    photo_urls JSONB DEFAULT '[]',
    player_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending_review', -- pending_review, reviewed, approved
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drill_submissions_drill_id ON drill_submissions(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_submissions_player_id ON drill_submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_drill_submissions_status ON drill_submissions(status);

-- 4. Coach Drill Reviews (feedback and scoring on submissions)
CREATE TABLE IF NOT EXISTS drill_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES drill_submissions(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 1 AND score <= 10),
    feedback TEXT,
    improvement_focus TEXT, -- e.g., "Weak foot control", "Head position"
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drill_reviews_submission_id ON drill_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_drill_reviews_coach_id ON drill_reviews(coach_id);

-- 5. Player Skill Scores (aggregate development profile)
CREATE TABLE IF NOT EXISTS player_skill_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    ball_control INTEGER DEFAULT 50 CHECK (ball_control BETWEEN 0 AND 100),
    passing INTEGER DEFAULT 50 CHECK (passing BETWEEN 0 AND 100),
    shooting INTEGER DEFAULT 50 CHECK (shooting BETWEEN 0 AND 100),
    agility INTEGER DEFAULT 50 CHECK (agility BETWEEN 0 AND 100),
    fitness INTEGER DEFAULT 50 CHECK (fitness BETWEEN 0 AND 100),
    goalkeeping INTEGER DEFAULT 50 CHECK (goalkeeping BETWEEN 0 AND 100),
    tactics INTEGER DEFAULT 50 CHECK (tactics BETWEEN 0 AND 100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_skill_scores_player_id ON player_skill_scores(player_id);
