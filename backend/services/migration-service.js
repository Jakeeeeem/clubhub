const { query } = require("../config/database");

async function runMigrations() {
  console.log("🚀 Checking for missing database columns...");
  try {
    // Add missing columns to players table if they don't exist
    await query(`
      DO $$ 
      BEGIN 
        -- Players table updates
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='payment_plan_id') THEN
          ALTER TABLE players ADD COLUMN payment_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='plan_price') THEN
          ALTER TABLE players ADD COLUMN plan_price DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='plan_start_date') THEN
          ALTER TABLE players ADD COLUMN plan_start_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='stripe_customer_id') THEN
          ALTER TABLE players ADD COLUMN stripe_customer_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='stripe_subscription_id') THEN
          ALTER TABLE players ADD COLUMN stripe_subscription_id VARCHAR(255);
        END IF;

        -- Invitations table updates
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='first_name') THEN
          ALTER TABLE invitations ADD COLUMN first_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='last_name') THEN
          ALTER TABLE invitations ADD COLUMN last_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='date_of_birth') THEN
          ALTER TABLE invitations ADD COLUMN date_of_birth DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='team_id') THEN
          ALTER TABLE invitations ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='phone') THEN
          ALTER TABLE invitations ADD COLUMN phone VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='position') THEN
          ALTER TABLE invitations ADD COLUMN position VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='sport') THEN
          ALTER TABLE invitations ADD COLUMN sport VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='gender') THEN
          ALTER TABLE invitations ADD COLUMN gender VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='location') THEN
          ALTER TABLE invitations ADD COLUMN location VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='bio') THEN
          ALTER TABLE invitations ADD COLUMN bio TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='payment_plan_id') THEN
          ALTER TABLE invitations ADD COLUMN payment_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='plan_price') THEN
          ALTER TABLE invitations ADD COLUMN plan_price DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='plan_start_date') THEN
          ALTER TABLE invitations ADD COLUMN plan_start_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='stripe_customer_id') THEN
          ALTER TABLE invitations ADD COLUMN stripe_customer_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='stripe_subscription_id') THEN
          ALTER TABLE invitations ADD COLUMN stripe_subscription_id VARCHAR(255);
        END IF;

        -- Phase 1 Core Team Features
        -- Events Table Recurrence & Settings
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='recurrence_pattern') THEN
          ALTER TABLE events ADD COLUMN recurrence_pattern VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='recurrence_end_date') THEN
          ALTER TABLE events ADD COLUMN recurrence_end_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='recurrence_id') THEN
          ALTER TABLE events ADD COLUMN recurrence_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='require_decline_reason') THEN
          ALTER TABLE events ADD COLUMN require_decline_reason BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='notification_schedule') THEN
          ALTER TABLE events ADD COLUMN notification_schedule JSONB;
        END IF;

        -- Create event_players junction table
        CREATE TABLE IF NOT EXISTS event_players (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_id, player_id)
        );

        -- Create event_reminder_log table to track sent notifications
        CREATE TABLE IF NOT EXISTS event_reminder_log (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            lead_time VARCHAR(10) NOT NULL,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_id, lead_time)
        );

        -- Phase 2: Tournament Enhancements
        -- Tournament Pitches
        CREATE TABLE IF NOT EXISTS tournament_pitches (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            pitch_type VARCHAR(50) DEFAULT 'Grass', -- Grass, 3G, 4G, Indoor
            pitch_size VARCHAR(50) DEFAULT '11v11', -- 5v5, 7v7, 9v9, 11v11
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add pitch_id to tournament_matches
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='pitch_id') THEN
          ALTER TABLE tournament_matches ADD COLUMN pitch_id UUID REFERENCES tournament_pitches(id) ON DELETE SET NULL;
        END IF;

        -- Add duration and buffer to stages for auto-scheduling
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_stages' AND column_name='match_duration') THEN
          ALTER TABLE tournament_stages ADD COLUMN match_duration INTEGER DEFAULT 20; -- minutes
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_stages' AND column_name='break_duration') THEN
          ALTER TABLE tournament_stages ADD COLUMN break_duration INTEGER DEFAULT 5; -- minutes
        END IF;

        -- Match Video Integration
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='video_url') THEN
          ALTER TABLE tournament_matches ADD COLUMN video_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='is_video_public') THEN
          ALTER TABLE tournament_matches ADD COLUMN is_video_public BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='video_price') THEN
          ALTER TABLE tournament_matches ADD COLUMN video_price DECIMAL(10,2) DEFAULT 0.00;
        END IF;

        -- Add indices for performance
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_players_event_id') THEN
            CREATE INDEX idx_event_players_event_id ON event_players(event_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_players_player_id') THEN
            CREATE INDEX idx_event_players_player_id ON event_players(player_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tournament_pitches_event_id') THEN
            CREATE INDEX idx_tournament_pitches_event_id ON tournament_pitches(event_id);
        END IF;

        -- Phase 3: Camp Management
        -- Camp Groups
        CREATE TABLE IF NOT EXISTS camp_groups (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            coach_id UUID REFERENCES staff(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Camp Bibs / Equipment Assignment
        CREATE TABLE IF NOT EXISTS camp_bibs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            player_id UUID REFERENCES players(id) ON DELETE SET NULL,
            bib_number VARCHAR(20) NOT NULL,
            bib_color VARCHAR(50),
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_id, bib_number)
        );

        -- Add group_id to event_players (for camp/training grouping)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_players' AND column_name='group_id') THEN
          ALTER TABLE event_players ADD COLUMN group_id UUID REFERENCES camp_groups(id) ON DELETE SET NULL;
        END IF;

        -- Phase 4: Scouting System
        -- Scout Verification
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='is_verified_scout') THEN
          ALTER TABLE staff ADD COLUMN is_verified_scout BOOLEAN DEFAULT FALSE;
        END IF;

        -- Scout Contact Requests
        CREATE TABLE IF NOT EXISTS scout_contact_requests (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            event_id UUID REFERENCES events(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'pending', -- pending, approved, declined
            delay_type VARCHAR(20) DEFAULT '24hr', -- immediate, 24hr
            notified_at TIMESTAMP WITH TIME ZONE,
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Customizable Scout Reports
        CREATE TABLE IF NOT EXISTS scout_reports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id UUID REFERENCES players(id) ON DELETE CASCADE,
            team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
            event_id UUID REFERENCES events(id) ON DELETE SET NULL,
            report_type VARCHAR(50) NOT NULL, -- player, team, match
            data JSONB NOT NULL, -- Flexible Jotform-style responses
            is_draft BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Scout Assignments (Self-assignment to games)
        CREATE TABLE IF NOT EXISTS scout_assignments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            ASSIGNED_AT TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(scout_id, event_id)
        );

        -- Phase 5: UI/UX Polish & Terminology
        -- Club Reviews
        CREATE TABLE IF NOT EXISTS club_reviews (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            club_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            is_verified_member BOOLEAN DEFAULT FALSE,
            status VARCHAR(50) DEFAULT 'published', -- pending, published, hidden
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(club_id, user_id)
        );

        -- Add alias column to organizations for "Group" name support
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='group_alias') THEN
          ALTER TABLE organizations ADD COLUMN group_alias VARCHAR(255);
        END IF;

        -- Signup Consents for Users
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='agree_terms') THEN
          ALTER TABLE users ADD COLUMN agree_terms BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='agree_third_party') THEN
          ALTER TABLE users ADD COLUMN agree_third_party BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='agree_privacy') THEN
          ALTER TABLE users ADD COLUMN agree_privacy BOOLEAN DEFAULT FALSE;
        END IF;

      END $$;
    `);
    console.log("✅ Database schema is up to date.");
  } catch (err) {
    console.error("❌ Auto-migration failed:", err.message);
    // Don't crash the server, but log it
  }
}

module.exports = { runMigrations };
