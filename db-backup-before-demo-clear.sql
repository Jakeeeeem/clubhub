--
-- PostgreSQL database dump
--

\restrict quProbgMqs3o2OhzhO2XEhpjbBX3VRw1E0o0b86uWKBhxNlJgHhGXWc955Qiy2h

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: sync_org_to_club(); Type: FUNCTION; Schema: public; Owner: clubhub_dev_db_user
--

CREATE FUNCTION public.sync_org_to_club() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO clubs (id, name, description, location, sport, owner_id, created_at, updated_at, types)
    VALUES (NEW.id, NEW.name, NEW.description, NEW.location, NEW.sport, NEW.owner_id, NEW.created_at, NEW.updated_at, COALESCE(NEW.types, ARRAY[]::TEXT[]))
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        sport = EXCLUDED.sport,
        types = COALESCE(EXCLUDED.types, ARRAY[]::TEXT[]),
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_org_to_club() OWNER TO clubhub_dev_db_user;

--
-- Name: update_organization_member_count(); Type: FUNCTION; Schema: public; Owner: clubhub_dev_db_user
--

CREATE FUNCTION public.update_organization_member_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE organizations 
        SET member_count = member_count + 1 
        WHERE id = NEW.organization_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE organizations 
        SET member_count = member_count - 1 
        WHERE id = OLD.organization_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_organization_member_count() OWNER TO clubhub_dev_db_user;

--
-- Name: update_organization_members_updated_at(); Type: FUNCTION; Schema: public; Owner: clubhub_dev_db_user
--

CREATE FUNCTION public.update_organization_members_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_organization_members_updated_at() OWNER TO clubhub_dev_db_user;

--
-- Name: update_organizations_updated_at(); Type: FUNCTION; Schema: public; Owner: clubhub_dev_db_user
--

CREATE FUNCTION public.update_organizations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_organizations_updated_at() OWNER TO clubhub_dev_db_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: clubhub_dev_db_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO clubhub_dev_db_user;

--
-- Name: update_user_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: clubhub_dev_db_user
--

CREATE FUNCTION public.update_user_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_preferences_updated_at() OWNER TO clubhub_dev_db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: availability_responses; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.availability_responses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    player_id uuid NOT NULL,
    availability character varying(10) NOT NULL,
    notes text,
    submitted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT availability_responses_availability_check CHECK (((availability)::text = ANY ((ARRAY['yes'::character varying, 'no'::character varying, 'maybe'::character varying])::text[])))
);


ALTER TABLE public.availability_responses OWNER TO clubhub_dev_db_user;

--
-- Name: bib_inventory; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.bib_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid,
    color character varying(50) NOT NULL,
    total_quantity integer DEFAULT 0,
    available_quantity integer DEFAULT 0,
    price numeric(10,2) DEFAULT 0.00,
    stripe_product_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bib_inventory OWNER TO clubhub_dev_db_user;

--
-- Name: bibs; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.bibs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    color character varying(50) NOT NULL,
    number character varying(10) NOT NULL,
    size character varying(20),
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bibs_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'assigned'::character varying, 'lost'::character varying])::text[])))
);


ALTER TABLE public.bibs OWNER TO clubhub_dev_db_user;

--
-- Name: camp_bibs; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.camp_bibs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    player_id uuid,
    bib_number character varying(20) NOT NULL,
    bib_color character varying(50),
    assigned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.camp_bibs OWNER TO clubhub_dev_db_user;

--
-- Name: camp_groups; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.camp_groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    coach_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.camp_groups OWNER TO clubhub_dev_db_user;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    content text NOT NULL,
    target_group character varying(100),
    target_team_id uuid,
    status character varying(50) DEFAULT 'draft'::character varying,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.campaigns OWNER TO clubhub_dev_db_user;

--
-- Name: club_applications; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.club_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    preferred_position character varying(50),
    experience_level character varying(20),
    availability text[],
    application_status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT club_applications_application_status_check CHECK (((application_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT club_applications_experience_level_check CHECK (((experience_level)::text = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying, 'professional'::character varying])::text[])))
);


ALTER TABLE public.club_applications OWNER TO clubhub_dev_db_user;

--
-- Name: club_reviews; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.club_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer,
    comment text,
    is_verified_member boolean DEFAULT false,
    status character varying(50) DEFAULT 'published'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT club_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.club_reviews OWNER TO clubhub_dev_db_user;

--
-- Name: clubs; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.clubs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    location character varying(255),
    philosophy text,
    website character varying(255),
    types text[] NOT NULL,
    sport character varying(100),
    owner_id uuid NOT NULL,
    member_count integer DEFAULT 0,
    established character varying(4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    contact_email character varying(255),
    images text[],
    contact_phone character varying(50),
    stripe_account_id character varying(255),
    is_mock boolean DEFAULT false
);


ALTER TABLE public.clubs OWNER TO clubhub_dev_db_user;

--
-- Name: custom_form_fields; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.custom_form_fields (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    form_id uuid NOT NULL,
    label character varying(255) NOT NULL,
    field_type character varying(50) NOT NULL,
    is_required boolean DEFAULT false,
    options jsonb,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.custom_form_fields OWNER TO clubhub_dev_db_user;

--
-- Name: custom_form_responses; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.custom_form_responses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    form_id uuid NOT NULL,
    user_id uuid,
    event_id uuid,
    response_data jsonb NOT NULL,
    submitted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.custom_form_responses OWNER TO clubhub_dev_db_user;

--
-- Name: custom_forms; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.custom_forms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.custom_forms OWNER TO clubhub_dev_db_user;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    document_type character varying(50) NOT NULL,
    file_url character varying(500),
    file_size integer,
    mime_type character varying(100),
    club_id uuid,
    access_level character varying(20) DEFAULT 'members'::character varying,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    venue_id uuid,
    CONSTRAINT documents_access_level_check CHECK (((access_level)::text = ANY ((ARRAY['public'::character varying, 'members'::character varying, 'staff'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT documents_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['policy'::character varying, 'schedule'::character varying, 'form'::character varying, 'guide'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.documents OWNER TO clubhub_dev_db_user;

--
-- Name: drill_assignments; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.drill_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drill_id uuid NOT NULL,
    assigned_to_player_id uuid,
    assigned_to_team_id uuid,
    assigned_by_coach_id uuid,
    due_date timestamp with time zone,
    status character varying(50) DEFAULT 'assigned'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT must_have_target CHECK (((assigned_to_player_id IS NOT NULL) OR (assigned_to_team_id IS NOT NULL)))
);


ALTER TABLE public.drill_assignments OWNER TO clubhub_dev_db_user;

--
-- Name: drill_reviews; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.drill_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    submission_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    score integer,
    feedback text,
    improvement_focus text,
    reviewed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT drill_reviews_score_check CHECK (((score >= 1) AND (score <= 10)))
);


ALTER TABLE public.drill_reviews OWNER TO clubhub_dev_db_user;

--
-- Name: drill_submissions; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.drill_submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drill_id uuid NOT NULL,
    assignment_id uuid,
    player_id uuid NOT NULL,
    video_url text,
    photo_urls jsonb DEFAULT '[]'::jsonb,
    player_notes text,
    status character varying(50) DEFAULT 'pending_review'::character varying,
    submitted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.drill_submissions OWNER TO clubhub_dev_db_user;

--
-- Name: drills; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.drills (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    coach_id uuid,
    title character varying(255) NOT NULL,
    description text,
    demo_video_url text,
    category character varying(100) DEFAULT 'General'::character varying,
    difficulty character varying(50) DEFAULT 'Beginner'::character varying,
    duration_minutes integer DEFAULT 10,
    required_equipment text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.drills OWNER TO clubhub_dev_db_user;

--
-- Name: event_bookings; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    player_id uuid,
    booking_status character varying(20) DEFAULT 'pending'::character varying,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    amount_paid numeric(10,2) DEFAULT 0,
    stripe_payment_intent_id character varying(255),
    booked_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_bookings_booking_status_check CHECK (((booking_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT event_bookings_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.event_bookings OWNER TO clubhub_dev_db_user;

--
-- Name: event_checkins; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    user_id uuid,
    checkin_time timestamp without time zone DEFAULT now(),
    checkin_method character varying(50) DEFAULT 'manual'::character varying,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.event_checkins OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE event_checkins; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.event_checkins IS 'Event attendance tracking via QR or manual check-in';


--
-- Name: event_group_players; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_group_players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    talent_registration_id uuid,
    player_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_group_players OWNER TO clubhub_dev_db_user;

--
-- Name: event_groups; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    coach_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_groups OWNER TO clubhub_dev_db_user;

--
-- Name: event_invitations; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    player_id uuid,
    invite_status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_invitations OWNER TO clubhub_dev_db_user;

--
-- Name: event_players; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    player_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    group_id uuid
);


ALTER TABLE public.event_players OWNER TO clubhub_dev_db_user;

--
-- Name: event_reminder_log; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_reminder_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    lead_time character varying(10) NOT NULL,
    sent_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_reminder_log OWNER TO clubhub_dev_db_user;

--
-- Name: event_schedules; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    activity_name character varying(255) NOT NULL,
    format character varying(50),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_schedules OWNER TO clubhub_dev_db_user;

--
-- Name: event_teams; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.event_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    team_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_teams OWNER TO clubhub_dev_db_user;

--
-- Name: events; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(50) NOT NULL,
    event_date date NOT NULL,
    event_time time without time zone,
    location character varying(255),
    price numeric(10,2) DEFAULT 0,
    capacity integer,
    spots_available integer,
    club_id uuid,
    team_id uuid,
    opponent character varying(255),
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    latitude numeric(10,8),
    longitude numeric(11,8),
    tournament_settings jsonb DEFAULT '{"format": "11v11", "match_duration": 90, "points_per_win": 3, "points_per_draw": 1}'::jsonb,
    recurrence_pattern character varying(50),
    recurrence_end_date date,
    recurrence_id uuid,
    require_decline_reason boolean DEFAULT false,
    notification_schedule jsonb,
    custom_form_id uuid,
    stripe_product_id character varying(255),
    image_url character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    CONSTRAINT events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['training'::character varying, 'match'::character varying, 'tournament'::character varying, 'camp'::character varying, 'social'::character varying, 'talent-id'::character varying])::text[])))
);


ALTER TABLE public.events OWNER TO clubhub_dev_db_user;

--
-- Name: fixtures; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.fixtures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    league_id uuid,
    home_team_id uuid,
    away_team_id uuid,
    scheduled_time timestamp without time zone,
    pitch character varying(100),
    referee_id uuid,
    home_score integer DEFAULT 0,
    away_score integer DEFAULT 0,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    match_week integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT different_teams CHECK ((home_team_id <> away_team_id))
);


ALTER TABLE public.fixtures OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE fixtures; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.fixtures IS 'League matches/fixtures';


--
-- Name: guest_submissions; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.guest_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    date_of_birth date,
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(50),
    additional_info jsonb DEFAULT '{}'::jsonb,
    submitted_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.guest_submissions OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE guest_submissions; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.guest_submissions IS 'Guest player information submitted for events';


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    invited_by uuid NOT NULL,
    token character varying(255) NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    accepted_by uuid,
    first_name character varying(255),
    last_name character varying(255),
    date_of_birth date,
    team_id uuid,
    is_public boolean DEFAULT false,
    declined_at timestamp with time zone,
    decline_reason text,
    personal_message text,
    phone character varying(50),
    "position" character varying(100),
    sport character varying(100),
    gender character varying(20),
    location character varying(255),
    bio text,
    payment_plan_id uuid,
    plan_price numeric(10,2),
    plan_start_date date,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    CONSTRAINT invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.invitations OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE invitations; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.invitations IS 'Pending invitations to join organizations';


--
-- Name: COLUMN invitations.token; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.invitations.token IS 'Unique token for invitation acceptance';


--
-- Name: league_pitches; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.league_pitches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    league_id uuid,
    pitch_name character varying(100) NOT NULL,
    location character varying(255),
    capacity integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.league_pitches OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE league_pitches; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.league_pitches IS 'Pitches/venues assigned to leagues';


--
-- Name: league_teams; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.league_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    league_id uuid,
    team_id uuid,
    points integer DEFAULT 0,
    wins integer DEFAULT 0,
    draws integer DEFAULT 0,
    losses integer DEFAULT 0,
    goals_for integer DEFAULT 0,
    goals_against integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.league_teams OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE league_teams; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.league_teams IS 'Teams participating in leagues with standings';


--
-- Name: leagues; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.leagues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name character varying(255) NOT NULL,
    season character varying(100),
    sport character varying(100),
    description text,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.leagues OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE leagues; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.leagues IS 'Sports leagues/competitions';


--
-- Name: listing_applications; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.listing_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    applicant_id uuid,
    player_id uuid,
    cover_letter text,
    application_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'pending'::character varying
);


ALTER TABLE public.listing_applications OWNER TO clubhub_dev_db_user;

--
-- Name: listings; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.listings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    listing_type character varying(50) NOT NULL,
    club_id uuid,
    "position" character varying(100),
    age_group character varying(50),
    requirements text,
    contact_email character varying(255),
    contact_phone character varying(20),
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    team_id uuid,
    CONSTRAINT listings_listing_type_check CHECK (((listing_type)::text = ANY ((ARRAY['recruitment'::character varying, 'player_available'::character varying, 'trial'::character varying])::text[])))
);


ALTER TABLE public.listings OWNER TO clubhub_dev_db_user;

--
-- Name: match_events; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.match_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fixture_id uuid,
    event_type character varying(50),
    team_id uuid,
    player_id uuid,
    minute integer,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.match_events OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE match_events; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.match_events IS 'In-match events (goals, cards, etc.)';


--
-- Name: match_results; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.match_results (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    home_score integer NOT NULL,
    away_score integer NOT NULL,
    result character varying(10) NOT NULL,
    match_notes text,
    recorded_by uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_results_result_check CHECK (((result)::text = ANY ((ARRAY['win'::character varying, 'loss'::character varying, 'draw'::character varying])::text[])))
);


ALTER TABLE public.match_results OWNER TO clubhub_dev_db_user;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    organization_id uuid,
    content text NOT NULL,
    type character varying(50) DEFAULT 'direct'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO clubhub_dev_db_user;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


ALTER TABLE public.migrations OWNER TO clubhub_dev_db_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO clubhub_dev_db_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: clubhub_dev_db_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    notification_type character varying(50) NOT NULL,
    is_read boolean DEFAULT false,
    action_url character varying(500),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_notification_type_check CHECK (((notification_type)::text = ANY ((ARRAY['payment'::character varying, 'event'::character varying, 'application'::character varying, 'general'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO clubhub_dev_db_user;

--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    "position" character varying(50),
    jersey_number integer,
    date_of_birth date,
    joined_at timestamp with time zone DEFAULT now(),
    invited_by uuid,
    invited_at timestamp with time zone,
    last_active_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organization_members_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'coach'::character varying, 'assistant_coach'::character varying, 'player'::character varying, 'parent'::character varying, 'staff'::character varying, 'viewer'::character varying])::text[]))),
    CONSTRAINT organization_members_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'pending'::character varying])::text[])))
);


ALTER TABLE public.organization_members OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE organization_members; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.organization_members IS 'User memberships in organizations with roles';


--
-- Name: COLUMN organization_members.role; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.organization_members.role IS 'User role within the organization';


--
-- Name: COLUMN organization_members.permissions; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.organization_members.permissions IS 'Custom permissions as JSON';


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    logo_url character varying(500),
    cover_image_url character varying(500),
    sport character varying(100),
    location character varying(255),
    address text,
    website character varying(255),
    email character varying(255),
    phone character varying(20),
    established character varying(4),
    stripe_account_id character varying(255),
    stripe_onboarding_complete boolean DEFAULT false,
    settings jsonb DEFAULT '{}'::jsonb,
    primary_color character varying(7),
    secondary_color character varying(7),
    member_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    images text[] DEFAULT '{}'::text[],
    philosophy text,
    types text[],
    is_mock boolean DEFAULT false,
    group_alias character varying(255)
);


ALTER TABLE public.organizations OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE organizations; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.organizations IS 'Organizations (clubs) that users can belong to';


--
-- Name: COLUMN organizations.images; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.organizations.images IS 'Array of image URLs for organization gallery (max 5)';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    club_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_type character varying(50) NOT NULL,
    description text NOT NULL,
    due_date date NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    paid_date timestamp with time zone,
    stripe_payment_intent_id character varying(255),
    stripe_charge_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_mock boolean DEFAULT false,
    CONSTRAINT payments_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT payments_payment_type_check CHECK (((payment_type)::text = ANY ((ARRAY['monthly_fee'::character varying, 'event_booking'::character varying, 'registration'::character varying, 'equipment'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO clubhub_dev_db_user;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "interval" character varying(20) DEFAULT 'month'::character varying,
    active boolean DEFAULT true,
    description text,
    club_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_mock boolean DEFAULT false,
    CONSTRAINT plans_interval_check CHECK ((("interval")::text = ANY ((ARRAY['week'::character varying, 'month'::character varying, 'year'::character varying])::text[])))
);


ALTER TABLE public.plans OWNER TO clubhub_dev_db_user;

--
-- Name: player_activities; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.player_activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    activity_type character varying(50) NOT NULL,
    description text,
    event_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.player_activities OWNER TO clubhub_dev_db_user;

--
-- Name: player_history; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.player_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    club_name character varying(255),
    team_name character varying(255),
    start_date date,
    end_date date,
    achievements text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.player_history OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE player_history; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.player_history IS 'Player career history and previous teams';


--
-- Name: player_plans; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.player_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    last_billing_date date,
    next_billing_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.player_plans OWNER TO clubhub_dev_db_user;

--
-- Name: player_ratings; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.player_ratings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_result_id uuid NOT NULL,
    player_id uuid NOT NULL,
    rating integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    goals integer DEFAULT 0,
    assists integer DEFAULT 0,
    yellow_cards integer DEFAULT 0,
    red_cards integer DEFAULT 0,
    minutes_played integer DEFAULT 0,
    CONSTRAINT player_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 10)))
);


ALTER TABLE public.player_ratings OWNER TO clubhub_dev_db_user;

--
-- Name: player_skill_scores; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.player_skill_scores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    ball_control integer DEFAULT 50,
    passing integer DEFAULT 50,
    shooting integer DEFAULT 50,
    agility integer DEFAULT 50,
    fitness integer DEFAULT 50,
    goalkeeping integer DEFAULT 50,
    tactics integer DEFAULT 50,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT player_skill_scores_agility_check CHECK (((agility >= 0) AND (agility <= 100))),
    CONSTRAINT player_skill_scores_ball_control_check CHECK (((ball_control >= 0) AND (ball_control <= 100))),
    CONSTRAINT player_skill_scores_fitness_check CHECK (((fitness >= 0) AND (fitness <= 100))),
    CONSTRAINT player_skill_scores_goalkeeping_check CHECK (((goalkeeping >= 0) AND (goalkeeping <= 100))),
    CONSTRAINT player_skill_scores_passing_check CHECK (((passing >= 0) AND (passing <= 100))),
    CONSTRAINT player_skill_scores_shooting_check CHECK (((shooting >= 0) AND (shooting <= 100))),
    CONSTRAINT player_skill_scores_tactics_check CHECK (((tactics >= 0) AND (tactics <= 100)))
);


ALTER TABLE public.player_skill_scores OWNER TO clubhub_dev_db_user;

--
-- Name: players; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(20),
    date_of_birth date NOT NULL,
    "position" character varying(50),
    club_id uuid,
    monthly_fee numeric(10,2) DEFAULT 0,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    attendance_rate integer DEFAULT 0,
    join_date timestamp with time zone DEFAULT now(),
    is_public boolean DEFAULT false,
    scouting_opt_in boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sport character varying(100),
    gender character varying(20),
    location character varying(255),
    bio text,
    height character varying(10),
    goals integer DEFAULT 0,
    assists integer DEFAULT 0,
    yellow_cards integer DEFAULT 0,
    red_cards integer DEFAULT 0,
    matches_played integer DEFAULT 0,
    payment_plan_id uuid,
    plan_price numeric(10,2),
    plan_start_date date,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    CONSTRAINT players_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['paid'::character varying, 'pending'::character varying, 'overdue'::character varying])::text[])))
);


ALTER TABLE public.players OWNER TO clubhub_dev_db_user;

--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.poll_votes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    poll_id uuid,
    user_id uuid,
    selection text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.poll_votes OWNER TO clubhub_dev_db_user;

--
-- Name: polls; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.polls (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    club_id uuid,
    title text NOT NULL,
    description text,
    options jsonb NOT NULL,
    status text DEFAULT 'active'::text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.polls OWNER TO clubhub_dev_db_user;

--
-- Name: product_orders; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.product_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    stripe_payment_intent_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    customization_details jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.product_orders OWNER TO clubhub_dev_db_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    stock_quantity integer DEFAULT 0,
    image_url character varying(500),
    category character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    custom_fields jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.products OWNER TO clubhub_dev_db_user;

--
-- Name: referee_availability; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.referee_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referee_id uuid,
    available_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.referee_availability OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE referee_availability; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.referee_availability IS 'Referee availability for matches';


--
-- Name: scheduled_notifications; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.scheduled_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    notification_type character varying(50),
    scheduled_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scheduled_notifications OWNER TO clubhub_dev_db_user;

--
-- Name: scout_assignments; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.scout_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    scout_id uuid NOT NULL,
    event_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scout_assignments OWNER TO clubhub_dev_db_user;

--
-- Name: scout_contact_requests; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.scout_contact_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    scout_id uuid NOT NULL,
    player_id uuid NOT NULL,
    event_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying,
    delay_type character varying(20) DEFAULT '24hr'::character varying,
    notified_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scout_contact_requests OWNER TO clubhub_dev_db_user;

--
-- Name: scout_reports; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.scout_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    scout_id uuid NOT NULL,
    player_id uuid,
    team_id uuid,
    event_id uuid,
    report_type character varying(50) NOT NULL,
    data jsonb NOT NULL,
    is_draft boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scout_reports OWNER TO clubhub_dev_db_user;

--
-- Name: scout_verification_requests; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.scout_verification_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    club_id uuid,
    id_card_url text,
    club_letter_url text,
    notes text,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.scout_verification_requests OWNER TO clubhub_dev_db_user;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.staff (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    role character varying(50) NOT NULL,
    permissions text[],
    club_id uuid NOT NULL,
    join_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    is_verified_scout boolean DEFAULT false,
    scout_verification_status character varying(20) DEFAULT 'unverified'::character varying,
    club_verified_scout boolean DEFAULT false,
    CONSTRAINT staff_role_check CHECK (((role)::text = ANY ((ARRAY['coach'::character varying, 'assistant-coach'::character varying, 'treasurer'::character varying, 'coaching-supervisor'::character varying, 'referee'::character varying, 'administrator'::character varying])::text[])))
);


ALTER TABLE public.staff OWNER TO clubhub_dev_db_user;

--
-- Name: tactical_formations; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tactical_formations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    formation_type character varying(20) NOT NULL,
    team_id uuid,
    coach_id uuid NOT NULL,
    formation_data jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tactical_formations OWNER TO clubhub_dev_db_user;

--
-- Name: talent_registrations; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.talent_registrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    "position" character varying(50),
    height character varying(10),
    bib_number character varying(10),
    bib_color character varying(50),
    status character varying(20) DEFAULT 'registered'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT talent_registrations_status_check CHECK (((status)::text = ANY ((ARRAY['registered'::character varying, 'checked_in'::character varying, 'declined'::character varying])::text[])))
);


ALTER TABLE public.talent_registrations OWNER TO clubhub_dev_db_user;

--
-- Name: team_coaches; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.team_coaches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.team_coaches OWNER TO clubhub_dev_db_user;

--
-- Name: team_players; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.team_players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid NOT NULL,
    "position" character varying(50),
    jersey_number integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_players OWNER TO clubhub_dev_db_user;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    age_group character varying(20),
    sport character varying(100) NOT NULL,
    description text,
    coach_id uuid,
    club_id uuid NOT NULL,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    draws integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO clubhub_dev_db_user;

--
-- Name: tournament_checkins; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    team_id uuid,
    user_id uuid,
    checkin_time timestamp without time zone DEFAULT now(),
    checkin_method character varying(50) DEFAULT 'manual'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tournament_checkins OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE tournament_checkins; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.tournament_checkins IS 'Tournament team check-ins';


--
-- Name: tournament_groups; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    stage_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tournament_groups OWNER TO clubhub_dev_db_user;

--
-- Name: tournament_match_events; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_match_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid,
    player_name_manual character varying(255),
    event_type character varying(50) NOT NULL,
    minute integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tournament_match_events OWNER TO clubhub_dev_db_user;

--
-- Name: tournament_matches; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_matches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    stage_id uuid NOT NULL,
    event_id uuid NOT NULL,
    home_team_id uuid,
    away_team_id uuid,
    home_team_placeholder character varying(255),
    away_team_placeholder character varying(255),
    home_score integer,
    away_score integer,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    start_time timestamp with time zone,
    field_location character varying(100),
    next_match_id uuid,
    progress_to_home boolean,
    round_number integer,
    match_number integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pitch_id uuid,
    end_time timestamp with time zone,
    video_url text,
    is_video_public boolean DEFAULT true,
    video_price numeric(10,2) DEFAULT 0.00,
    CONSTRAINT tournament_matches_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'live'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.tournament_matches OWNER TO clubhub_dev_db_user;

--
-- Name: tournament_pitches; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_pitches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    pitch_type character varying(50) DEFAULT 'Grass'::character varying,
    pitch_size character varying(50) DEFAULT '11v11'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tournament_pitches OWNER TO clubhub_dev_db_user;

--
-- Name: tournament_stages; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_stages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    sequence integer NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    match_duration integer DEFAULT 20,
    break_duration integer DEFAULT 5,
    CONSTRAINT tournament_stages_type_check CHECK (((type)::text = ANY ((ARRAY['league'::character varying, 'knockout'::character varying])::text[])))
);


ALTER TABLE public.tournament_stages OWNER TO clubhub_dev_db_user;

--
-- Name: tournament_teams; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.tournament_teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    team_name character varying(255) NOT NULL,
    logo_url character varying(500),
    contact_email character varying(255),
    contact_phone character varying(50),
    status character varying(50) DEFAULT 'pending'::character varying,
    group_id uuid,
    stats jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    internal_team_id uuid,
    current_group_id uuid,
    CONSTRAINT tournament_teams_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'checked_in'::character varying])::text[])))
);


ALTER TABLE public.tournament_teams OWNER TO clubhub_dev_db_user;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    current_organization_id uuid,
    theme character varying(20) DEFAULT 'dark'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_preferences OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE user_preferences; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.user_preferences IS 'User preferences including current organization';


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date_of_birth date,
    gender character varying,
    location character varying,
    sport character varying,
    "position" character varying,
    bio text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_profiles OWNER TO clubhub_dev_db_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    account_type character varying(20) NOT NULL,
    org_types text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT true,
    is_platform_admin boolean DEFAULT false,
    reset_token character varying(255),
    reset_expires timestamp without time zone,
    phone character varying(20),
    date_of_birth date,
    email_recovery_enabled boolean DEFAULT true,
    auto_payments_enabled boolean DEFAULT false,
    payment_reminders_enabled boolean DEFAULT true,
    receipt_emails_enabled boolean DEFAULT true,
    is_mock boolean DEFAULT false,
    completed_tours jsonb DEFAULT '[]'::jsonb,
    is_verified_scout boolean DEFAULT false,
    scout_verification_status character varying(20) DEFAULT 'unverified'::character varying,
    agree_terms boolean DEFAULT false,
    agree_third_party boolean DEFAULT false,
    agree_privacy boolean DEFAULT false,
    stripe_account_id character varying(255),
    CONSTRAINT users_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['adult'::character varying, 'organization'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO clubhub_dev_db_user;

--
-- Name: COLUMN users.is_platform_admin; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.users.is_platform_admin IS 'Platform-level administrator with access to all organizations and system settings';


--
-- Name: COLUMN users.reset_token; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.users.reset_token IS 'Token for password reset';


--
-- Name: COLUMN users.reset_expires; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON COLUMN public.users.reset_expires IS 'Expiration time for reset token';


--
-- Name: venue_availability; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.venue_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid,
    day_of_week integer,
    start_time time without time zone,
    end_time time without time zone,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.venue_availability OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE venue_availability; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.venue_availability IS 'Recurring availability rules for venues';


--
-- Name: venue_bookings; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.venue_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid,
    user_id uuid,
    organization_id uuid,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    total_cost numeric(10,2),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT valid_booking_time CHECK ((end_time > start_time))
);


ALTER TABLE public.venue_bookings OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE venue_bookings; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.venue_bookings IS 'Venue booking records';


--
-- Name: venue_checkins; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.venue_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid,
    booking_id uuid,
    user_id uuid,
    checkin_time timestamp without time zone DEFAULT now(),
    checkin_method character varying(50) DEFAULT 'manual'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.venue_checkins OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE venue_checkins; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.venue_checkins IS 'Venue booking check-ins';


--
-- Name: venues; Type: TABLE; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name character varying(255) NOT NULL,
    location character varying(255),
    description text,
    capacity integer,
    facilities jsonb DEFAULT '[]'::jsonb,
    hourly_rate numeric(10,2) DEFAULT 0,
    image_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    entry_price numeric(10,2) DEFAULT 0.00,
    stripe_product_id character varying(255)
);


ALTER TABLE public.venues OWNER TO clubhub_dev_db_user;

--
-- Name: TABLE venues; Type: COMMENT; Schema: public; Owner: clubhub_dev_db_user
--

COMMENT ON TABLE public.venues IS 'Sports venues/facilities available for booking';


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: availability_responses; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.availability_responses (id, event_id, player_id, availability, notes, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bib_inventory; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.bib_inventory (id, club_id, color, total_quantity, available_quantity, price, stripe_product_id, created_at, updated_at) FROM stdin;
408b803d-5b21-4e0f-8004-d420ffcf5cf5	a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	TestColor-1779129308960	24	24	0.00	\N	2026-05-18 18:35:10.366791+00	2026-05-18 18:35:10.366791+00
4cee56c1-f56a-41e4-8943-e91e0e1dc129	29fac061-0e2a-4184-814f-f653c89d72d9	TestColor-1779129322832	24	24	0.00	\N	2026-05-18 18:35:25.580728+00	2026-05-18 18:35:25.580728+00
9a3a6caf-8e19-4844-87b3-30e35e3f4a9c	ac767b0a-348f-4e4b-9ade-5b56cbc82c28	TestColor-1779129505477	24	24	0.00	\N	2026-05-18 18:38:26.848608+00	2026-05-18 18:38:26.848608+00
056ccdeb-6c07-4036-9b37-22decfa4024e	858577b3-5159-4b22-92e4-1efcbb9dfab6	TestColor-1779468163736	24	24	0.00	\N	2026-05-22 16:42:49.475086+00	2026-05-22 16:42:49.475086+00
95e25fd7-48b6-4a3f-96c1-2e279468a136	f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	TestColor-1779468321681	24	24	0.00	\N	2026-05-22 16:45:28.42054+00	2026-05-22 16:45:28.42054+00
72c6865c-22a5-4066-8bd4-20c1bb82e4f3	bf71b29d-45ad-4177-82e5-81d0500c6d7c	TestColor-1779468455308	24	24	0.00	\N	2026-05-22 16:47:37.91271+00	2026-05-22 16:47:37.91271+00
f8bff85b-81f2-4a46-af07-4c0c2682269a	2dac0366-5a26-4a81-9e14-d06741c21377	TestColor-1779557114834	24	24	0.00	\N	2026-05-23 17:25:17.034986+00	2026-05-23 17:25:17.034986+00
ad519456-1f27-49b9-847b-fd5f5a87c67d	055e8358-9654-4c0f-b0d3-f7868c7eca0c	TestColor-1779557858642	24	24	0.00	\N	2026-05-23 17:37:42.204371+00	2026-05-23 17:37:42.204371+00
ae5c7aa3-558d-4cc9-a580-81ea76e798d7	d05d8c3b-b5d9-4b93-b574-245cce1857b6	TestColor-1779560944266	24	24	0.00	\N	2026-05-23 18:29:05.987312+00	2026-05-23 18:29:05.987312+00
46e748ee-5582-4810-aa11-c48ea1fee279	59e94b15-0fad-4063-a4ed-23a0403dbfbe	TestColor-1779560960090	24	24	0.00	\N	2026-05-23 18:29:21.566341+00	2026-05-23 18:29:21.566341+00
12ff7223-3ae9-4098-bf06-cf49d55be67f	ceefa0f7-391e-4c32-b63e-f2988479113b	TestColor-1779562092834	24	24	0.00	\N	2026-05-23 18:48:14.522121+00	2026-05-23 18:48:14.522121+00
12e836bd-5b2a-4216-8659-42e371262408	5febfc64-85aa-442a-a649-27b9917c2b52	TestColor-1779800078705	24	24	0.00	\N	2026-05-26 12:54:40.983826+00	2026-05-26 12:54:40.983826+00
d1968f74-573e-47c1-aa1f-607352405f0e	8f35302b-ee04-4eaa-86ad-f33de2280314	TestColor-1779800098527	24	24	0.00	\N	2026-05-26 12:54:59.808514+00	2026-05-26 12:54:59.808514+00
d9f5d58e-5f8f-4025-96bd-e69bcefd1556	9401a922-ca4e-4c36-a76d-c8b080e128ec	TestColor-1779810574265	24	24	0.00	\N	2026-05-26 15:49:36.269017+00	2026-05-26 15:49:36.269017+00
6fbccba2-b6cc-43e0-af8f-43158dd5c8a3	3c19bc27-a105-4f8b-982d-e0cb01ea0524	TestColor-1779818963638	24	24	0.00	\N	2026-05-26 18:09:25.611294+00	2026-05-26 18:09:25.611294+00
\.


--
-- Data for Name: bibs; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.bibs (id, club_id, color, number, size, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: camp_bibs; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.camp_bibs (id, event_id, player_id, bib_number, bib_color, assigned_at) FROM stdin;
\.


--
-- Data for Name: camp_groups; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.camp_groups (id, event_id, name, coach_id, created_at) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.campaigns (id, club_id, name, subject, content, target_group, target_team_id, status, scheduled_at, sent_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: club_applications; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.club_applications (id, club_id, user_id, message, preferred_position, experience_level, availability, application_status, reviewed_by, reviewed_at, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: club_reviews; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.club_reviews (id, club_id, user_id, rating, comment, is_verified_member, status, created_at) FROM stdin;
\.


--
-- Data for Name: clubs; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.clubs (id, name, description, location, philosophy, website, types, sport, owner_id, member_count, established, created_at, updated_at, contact_email, images, contact_phone, stripe_account_id, is_mock) FROM stdin;
ceefa0f7-391e-4c32-b63e-f2988479113b	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	e62d9f00-dc7f-443d-84ed-3f69e4091de2	0	\N	2026-05-23 18:48:13.196552+00	2026-05-23 18:48:14.276118+00	\N	\N	\N	\N	f
59d9f848-783b-4569-b7d7-6a84c9acbf39	ClubHub United Academy	Premier professional academy showcasing elite development pathways.	London, UK	\N	\N	{}	Football	66d95ba5-b8cb-417d-97c2-7822afbae01d	0	\N	2026-04-26 18:15:22.575077+00	2026-04-26 18:15:22.575077+00	\N	\N	\N	\N	f
d05d8c3b-b5d9-4b93-b574-245cce1857b6	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	f9113420-4632-4afa-8312-f4bb05ebf5f3	0	\N	2026-05-23 18:29:04.64069+00	2026-05-23 18:29:05.717504+00	\N	\N	\N	\N	f
8f35302b-ee04-4eaa-86ad-f33de2280314	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	37cce6e4-9daa-4925-991c-7c46e01d7efe	0	\N	2026-05-26 12:54:58.849485+00	2026-05-26 12:54:59.72428+00	\N	\N	\N	\N	f
9401a922-ca4e-4c36-a76d-c8b080e128ec	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	7540dcae-6b5c-4624-ba37-d59e28ecefe1	0	\N	2026-05-26 15:49:34.793239+00	2026-05-26 15:49:36.127069+00	\N	\N	\N	\N	f
2dac0366-5a26-4a81-9e14-d06741c21377	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	462f3e64-64f7-4469-bfce-b807f21acc36	0	\N	2026-05-23 17:25:15.606538+00	2026-05-23 17:25:16.873735+00	\N	\N	\N	\N	f
223de646-383d-433d-a0a2-27ab0e0c8434	test		manchester	\N	\N	{}	Football	65c3983f-efa4-482f-9ce3-1efc9bf2c765	0	\N	2026-05-10 18:28:17.627689+00	2026-05-10 18:28:17.627689+00	\N	\N	\N	\N	f
c4c0c1cc-7824-4693-8155-e3fd1af56192	johndoe87bsssaby's Club	\N	\N	\N	\N	{}	Football	7ee42dca-a4bc-48e8-a842-7112797773c6	0	\N	2026-05-23 17:58:00.615175+00	2026-05-26 22:17:15.225288+00	\N	\N	\N	\N	f
7e0569fb-c741-40df-bc2d-0b8f6f3edf15	Christopher Callaghan t		manchester	\N	\N	{}	Football	65c3983f-efa4-482f-9ce3-1efc9bf2c765	0	\N	2026-05-04 15:41:45.888224+00	2026-05-04 15:41:45.888224+00	\N	\N	\N	\N	f
9eac6b1a-302f-42d1-815e-d64120e5a494	Test Org 94302	Temporary org for messages.test	Local	\N	\N	{}	Football	4e520751-45ee-4376-947f-c8b5c709ced9	0	\N	2026-05-22 16:47:31.878186+00	2026-05-22 16:47:31.894688+00	\N	\N	\N	\N	f
5febfc64-85aa-442a-a649-27b9917c2b52	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	3481968e-1f51-4e7f-bdaf-167c07e2c2ba	0	\N	2026-05-26 12:54:39.527338+00	2026-05-26 12:54:40.744398+00	\N	\N	\N	\N	f
bf71b29d-45ad-4177-82e5-81d0500c6d7c	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	63314300-ec7c-4971-9012-3e0ae0d2cc37	0	\N	2026-05-22 16:47:36.196023+00	2026-05-22 16:47:37.584393+00	\N	\N	\N	\N	f
2f81f295-1e7a-4874-a360-64ab0edde681	Christopher Callaghan test		manchester	\N	\N	{}	Football	65c3983f-efa4-482f-9ce3-1efc9bf2c765	0	\N	2026-05-04 17:05:27.100495+00	2026-05-11 19:52:31.613402+00	\N	\N	\N	\N	f
a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	4a008854-f94a-448f-8fc9-17691a933185	0	\N	2026-05-18 18:35:09.310242+00	2026-05-18 18:35:10.24319+00	\N	\N	\N	\N	f
29fac061-0e2a-4184-814f-f653c89d72d9	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	a3cff818-78e0-40d5-9c75-4ed0c347c09d	0	\N	2026-05-18 18:35:23.146122+00	2026-05-18 18:35:25.450378+00	\N	\N	\N	\N	f
ac767b0a-348f-4e4b-9ade-5b56cbc82c28	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	24c9e08f-be23-403d-b369-d5ed8c60d8d7	0	\N	2026-05-18 18:38:25.812478+00	2026-05-18 18:38:26.737924+00	\N	\N	\N	\N	f
858577b3-5159-4b22-92e4-1efcbb9dfab6	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	0796735e-0f46-4143-afe1-28855541cf37	0	\N	2026-05-22 16:42:47.022584+00	2026-05-22 16:42:49.181656+00	\N	\N	\N	\N	f
59e94b15-0fad-4063-a4ed-23a0403dbfbe	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	fd679cdb-1fc1-4d12-8fb8-1dcd6e75616e	0	\N	2026-05-23 18:29:20.446877+00	2026-05-23 18:29:21.317023+00	\N	\N	\N	\N	f
3c19bc27-a105-4f8b-982d-e0cb01ea0524	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	f7d2714f-bec1-48d6-b457-1d0d530bd1da	0	\N	2026-05-26 18:09:24.277526+00	2026-05-26 18:09:25.416652+00	\N	\N	\N	\N	f
f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	154d34ce-dcfc-4c6a-90e7-7951d7642184	0	\N	2026-05-22 16:45:26.367019+00	2026-05-22 16:45:28.061387+00	\N	\N	\N	\N	f
b4896131-2292-4295-9dca-8a76eb565321	Test Org 87916	Temporary org for messages.test	Local	\N	\N	{}	Football	61c286e3-e085-45c4-aac5-1eeb092af44c	0	\N	2026-05-22 16:47:17.606394+00	2026-05-22 16:47:17.647011+00	\N	\N	\N	\N	f
055e8358-9654-4c0f-b0d3-f7868c7eca0c	Integration Test's club	New organization created with ClubHub	To be updated	\N	\N	{}	club	7ee7a4be-bb27-46e6-936e-306f2b6c5b33	0	\N	2026-05-23 17:37:39.453417+00	2026-05-23 17:37:42.01699+00	\N	\N	\N	\N	f
\.


--
-- Data for Name: custom_form_fields; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.custom_form_fields (id, form_id, label, field_type, is_required, options, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: custom_form_responses; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.custom_form_responses (id, form_id, user_id, event_id, response_data, submitted_at) FROM stdin;
\.


--
-- Data for Name: custom_forms; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.custom_forms (id, organization_id, title, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.documents (id, name, document_type, file_url, file_size, mime_type, club_id, access_level, uploaded_by, uploaded_at, updated_at, venue_id) FROM stdin;
\.


--
-- Data for Name: drill_assignments; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.drill_assignments (id, drill_id, assigned_to_player_id, assigned_to_team_id, assigned_by_coach_id, due_date, status, created_at) FROM stdin;
\.


--
-- Data for Name: drill_reviews; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.drill_reviews (id, submission_id, coach_id, score, feedback, improvement_focus, reviewed_at) FROM stdin;
\.


--
-- Data for Name: drill_submissions; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.drill_submissions (id, drill_id, assignment_id, player_id, video_url, photo_urls, player_notes, status, submitted_at) FROM stdin;
\.


--
-- Data for Name: drills; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.drills (id, org_id, coach_id, title, description, demo_video_url, category, difficulty, duration_minutes, required_equipment, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_bookings; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_bookings (id, event_id, user_id, player_id, booking_status, payment_status, amount_paid, stripe_payment_intent_id, booked_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_checkins; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_checkins (id, event_id, user_id, checkin_time, checkin_method, location_lat, location_lng, created_at) FROM stdin;
\.


--
-- Data for Name: event_group_players; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_group_players (id, group_id, talent_registration_id, player_id, created_at) FROM stdin;
\.


--
-- Data for Name: event_groups; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_groups (id, event_id, name, coach_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_invitations; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_invitations (id, event_id, player_id, invite_status, created_at) FROM stdin;
\.


--
-- Data for Name: event_players; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_players (id, event_id, player_id, assigned_at, group_id) FROM stdin;
\.


--
-- Data for Name: event_reminder_log; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_reminder_log (id, event_id, lead_time, sent_at) FROM stdin;
\.


--
-- Data for Name: event_schedules; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_schedules (id, event_id, start_time, end_time, activity_name, format, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_teams; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.event_teams (id, event_id, team_id, created_at, updated_at) FROM stdin;
257809bc-f0c7-4d4c-89c3-d28c7187119d	2b847f18-ad32-43b8-a991-eb3be4f4cfff	d4217b0e-4437-4c7e-9525-654feb4c1126	2026-05-26 23:25:36.898495+00	2026-05-26 23:25:36.898495+00
ff00896a-fc73-4a77-814d-077c599f57cb	2b847f18-ad32-43b8-a991-eb3be4f4cfff	95a32450-4114-4e62-8049-b1e1da94046a	2026-05-26 23:25:36.898495+00	2026-05-26 23:25:36.898495+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.events (id, title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, team_id, opponent, created_by, created_at, updated_at, latitude, longitude, tournament_settings, recurrence_pattern, recurrence_end_date, recurrence_id, require_decline_reason, notification_schedule, custom_form_id, stripe_product_id, image_url, status) FROM stdin;
f07f2008-4189-4170-9dda-f38088df4ca7	dfgfgdfg	sdffsfgfg	training	2026-05-27	01:00:00	manchester	0.00	555	555	c4c0c1cc-7824-4693-8155-e3fd1af56192	\N	\N	7ee42dca-a4bc-48e8-a842-7112797773c6	2026-05-26 23:32:49.647729+00	2026-05-26 23:32:49.647729+00	\N	\N	{}	\N	\N	\N	f	[]	\N	\N	\N	active
55d5ffe9-66ac-42c8-8434-421b6d16fd75	fsdfsdf	sdfsdf	training	2026-06-05	01:00:00	manchester	0.00	55	55	c4c0c1cc-7824-4693-8155-e3fd1af56192	\N	\N	7ee42dca-a4bc-48e8-a842-7112797773c6	2026-05-26 23:47:09.400853+00	2026-05-26 23:47:09.400853+00	\N	\N	{}	\N	\N	\N	f	[]	\N	\N	\N	active
2b847f18-ad32-43b8-a991-eb3be4f4cfff	xfffxvg	xvfxvf	training	2026-05-27	03:00:00	manchester	0.00	54	54	c4c0c1cc-7824-4693-8155-e3fd1af56192	\N	\N	7ee42dca-a4bc-48e8-a842-7112797773c6	2026-05-26 23:25:36.898495+00	2026-05-27 00:24:10.879385+00	\N	\N	{}	\N	\N	\N	f	[]	\N	\N	/uploads/event-images/event-1779841450875-611763197.png	active
\.


--
-- Data for Name: fixtures; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.fixtures (id, league_id, home_team_id, away_team_id, scheduled_time, pitch, referee_id, home_score, away_score, status, match_week, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: guest_submissions; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.guest_submissions (id, event_id, first_name, last_name, email, phone, date_of_birth, emergency_contact_name, emergency_contact_phone, additional_info, submitted_at) FROM stdin;
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.invitations (id, organization_id, email, role, invited_by, token, message, status, expires_at, created_at, accepted_at, accepted_by, first_name, last_name, date_of_birth, team_id, is_public, declined_at, decline_reason, personal_message, phone, "position", sport, gender, location, bio, payment_plan_id, plan_price, plan_start_date, stripe_customer_id, stripe_subscription_id) FROM stdin;
762612f7-a55c-433f-afdc-19a230d6347c	c4c0c1cc-7824-4693-8155-e3fd1af56192	payments@christopherjcallaghan.co.uk	player	7ee42dca-a4bc-48e8-a842-7112797773c6	8a85e6888d032d1d22d01489ff2294e1cb305a5a51a252d794c52d4e88535db3	Join johndoe87bsssaby's Club - a great sports club!	accepted	2027-05-26 13:30:04.035+00	2026-05-26 13:30:04.038162+00	2026-05-26 21:48:20.434142+00	7ee42dca-a4bc-48e8-a842-7112797773c6	Chris	Callaghan	2026-04-28	95a32450-4114-4e62-8049-b1e1da94046a	f	\N	\N	\N	\N	sfdfds	\N	\N	\N	\N	\N	\N	\N	\N	\N
b95f13ae-883b-4fe3-a941-85abee9b1e9c	c4c0c1cc-7824-4693-8155-e3fd1af56192	instantonlinesuccesscdcdcdc@gmail.com	player	7ee42dca-a4bc-48e8-a842-7112797773c6	97633fe64a8ae54014478ad11a2adc036712c94b488dc49ba7f6272520d3a393	Join johndoe87bsssaby's Club - a great sports club!	accepted	2027-05-26 21:50:37.848+00	2026-05-26 21:50:37.848347+00	2026-05-26 21:51:04.204397+00	7ee42dca-a4bc-48e8-a842-7112797773c6	Christopher	Callaghan	2026-05-14	\N	f	\N	\N	\N	\N	stricker	\N	\N	\N	\N	\N	\N	\N	\N	\N
1624ce73-708a-4af2-85a5-f0a0882b11df	c4c0c1cc-7824-4693-8155-e3fd1af56192	instantonlinesuccessdsfsdf@gmail.com	player	7ee42dca-a4bc-48e8-a842-7112797773c6	d817e3d6835c31a58babcf9de944d15e2b6533d89f6e78ca25ec2a686c5d8e60	Join johndoe87bsssaby's Club - a great sports club!	accepted	2027-05-26 21:53:45.767+00	2026-05-26 21:53:45.768035+00	2026-05-26 21:54:11.115689+00	7ee42dca-a4bc-48e8-a842-7112797773c6	Christopher	Callaghan	2026-05-08	\N	f	\N	\N	\N	\N	stricker	\N	\N	\N	\N	\N	\N	\N	\N	\N
1c8e5454-2f9d-43c8-aaf6-acfcf4cc8fac	c4c0c1cc-7824-4693-8155-e3fd1af56192	instantonlinesuccesssdfsdfs@gmail.com	player	7ee42dca-a4bc-48e8-a842-7112797773c6	83f1b9a4673fda21def24a4dd79e8022aab982b359e430af4f4055622cee1a75	Join johndoe87bsssaby's Club - a great sports club!	pending	2027-05-26 22:16:18.011+00	2026-05-26 22:16:18.012186+00	\N	\N	Christopher	Callaghan	2026-05-07	\N	f	\N	\N	\N	\N	forward	\N	\N	\N	\N	\N	\N	\N	\N	\N
7d976822-cf1f-4719-841c-ebdc096bf7b8	c4c0c1cc-7824-4693-8155-e3fd1af56192	instantonlinesuccessdsdsdsd@gmail.com	player	7ee42dca-a4bc-48e8-a842-7112797773c6	da68757e88b3db7653e12db0fd0cbcf8ffc89940c542fc9493afcefac2f190db	Join johndoe87bsssaby's Club - a great sports club!	accepted	2027-05-26 19:31:25.242+00	2026-05-26 19:31:25.244843+00	2026-05-26 22:17:15.225288+00	7ee42dca-a4bc-48e8-a842-7112797773c6	Christopher	Callaghan	2026-05-22	\N	f	\N	\N	\N	\N	forward	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: league_pitches; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.league_pitches (id, league_id, pitch_name, location, capacity, created_at) FROM stdin;
\.


--
-- Data for Name: league_teams; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.league_teams (id, league_id, team_id, points, wins, draws, losses, goals_for, goals_against, created_at) FROM stdin;
\.


--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.leagues (id, organization_id, name, season, sport, description, start_date, end_date, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: listing_applications; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.listing_applications (id, listing_id, applicant_id, player_id, cover_letter, application_data, created_at, updated_at, status) FROM stdin;
\.


--
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.listings (id, title, description, listing_type, club_id, "position", age_group, requirements, contact_email, contact_phone, is_active, created_by, created_at, updated_at, expires_at, team_id) FROM stdin;
\.


--
-- Data for Name: match_events; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.match_events (id, fixture_id, event_type, team_id, player_id, minute, description, created_at) FROM stdin;
\.


--
-- Data for Name: match_results; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.match_results (id, event_id, home_score, away_score, result, match_notes, recorded_by, recorded_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.messages (id, sender_id, receiver_id, organization_id, content, type, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.migrations (id, name, run_on) FROM stdin;
1	/20251230141500-initial-schema	2026-04-26 18:04:51.558
2	/20251230192500-add-player-cv-fields	2026-04-26 18:04:51.567
3	/20251230194000-add-club-images	2026-04-26 18:04:51.569
4	/20251230230000-create-listings-table	2026-04-26 18:09:00.84
5	/20251230235000-add-listing-status	2026-04-26 18:09:00.846
6	/20251230235500-add-shop-customizations	2026-04-26 18:09:00.852
7	/20251231000000-talent-id-schema	2026-04-26 18:09:00.881
8	/20251231010000-tournament-schema	2026-04-26 18:09:00.898
9	/20260107134000-add-demo-users	2026-04-26 18:09:00.903
10	/20260109000000-unified-account-system	2026-04-26 18:09:00.94
11	/20260109000001-migrate-data-to-unified-system	2026-04-26 18:09:47.487
12	/20260110000000-add-platform-admin	2026-04-26 18:09:47.495
13	/20260113000000-venue-booking-system	2026-04-26 18:09:47.511
14	/20260113000001-league-management-system	2026-04-26 18:09:47.541
15	/20260113000002-password-reset	2026-04-26 18:09:47.546
16	/20260113000003-player-history	2026-04-26 18:09:47.549
17	/20260113000004-qr-checkin-system	2026-04-26 18:09:47.562
18	/20260113000005-guest-submissions	2026-04-26 18:09:47.568
19	/20260113000006-voting-system	2026-04-26 18:09:47.579
20	/20260113000007-event-location	2026-04-26 18:09:47.582
21	/20260113000008-venue-documents	2026-04-26 18:09:47.585
22	/20260115000000-add-organization-images	2026-04-26 18:09:47.589
23	/20260115134747-add-philosophy-to-organizations	2026-04-26 18:09:47.591
24	/20260128174200-add-email-verified-to-users	2026-04-26 18:10:22.089
25	/20260128174342-add-missing-columns-to-clubs	2026-04-26 18:10:22.095
26	/20260128174428-add-unique-owner-to-clubs	2026-04-26 18:11:17.036
27	/20260128174543-add-is-active-to-staff	2026-04-26 18:11:17.041
28	/20260128174818-fix-schema-for-demo	2026-04-26 18:11:39.756
29	/20260130000000-finalize-unified-system	2026-04-26 18:11:39.779
30	/20260130150000-tournament-enhancements	2026-04-26 18:11:39.791
31	/20260130151500-player-stats	2026-04-26 18:11:39.795
32	/20260131120000-add-is-active-to-users	2026-04-26 18:11:39.797
33	/20260131164500-add-user-fields	2026-04-26 18:11:39.8
34	/20260203000000-fix-sync-trigger	2026-04-26 18:11:39.803
35	/20260203171744-finalize-unified-system	2026-04-26 18:11:39.807
36	/20260203195222-fix-sync-trigger	2026-04-26 18:11:39.809
37	/20260208000000-add-is-mock	2026-04-26 18:11:39.812
38	/20260210000000-force-update-invitations	2026-04-26 18:11:39.815
39	/20260210124000-add-payment-plan-to-players	2026-04-26 18:11:39.822
40	/20260211153414-change-player-defaults	2026-04-26 18:11:39.826
41	/20260211163000-detailed-player-stats	2026-04-26 18:11:39.833
42	/20260212000000-add-completed-tours-to-users	2026-04-26 18:11:39.835
43	/20260221180000-phase1-core-team-features	2026-04-26 18:11:39.844
44	/20260302183013-create-custom-forms	2026-04-26 18:11:39.855
45	/20260303100000-add-tournament-pitches	2026-04-26 18:11:39.863
46	/20260303222021-add-unique-to-match-results	2026-04-26 18:11:39.866
47	/20260311200000-scout-verification-system	2026-04-26 18:11:39.883
48	/20260322150847-create-scheduled-notifications	2026-04-26 18:11:39.885
49	/20260411163000-create-messages-table	2026-04-26 18:11:39.895
50	/20260426150000-bib-inventory-and-stripe-links	2026-04-26 18:11:39.9
51	/20260426174006-finalize-unified-schema	2026-04-26 18:55:55.821
52	/20260426180000-deep-seed-demo-data	2026-04-26 19:15:22.596
53	/20260311143500-training-drills-system	2026-05-23 18:31:20.532
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.notifications (id, user_id, title, message, notification_type, is_read, action_url, created_at) FROM stdin;
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.organization_members (id, organization_id, user_id, role, permissions, status, "position", jersey_number, date_of_birth, joined_at, invited_by, invited_at, last_active_at, created_at, updated_at) FROM stdin;
bf45a2ff-fce6-437b-963f-100744614abb	055e8358-9654-4c0f-b0d3-f7868c7eca0c	7ee7a4be-bb27-46e6-936e-306f2b6c5b33	owner	{}	active	\N	\N	\N	2026-05-23 17:37:39.453417+00	\N	\N	\N	2026-05-23 17:37:39.453417+00	2026-05-23 17:37:39.453417+00
c33bbc5a-1538-4dc7-8a62-d499eb40c516	d05d8c3b-b5d9-4b93-b574-245cce1857b6	f9113420-4632-4afa-8312-f4bb05ebf5f3	owner	{}	active	\N	\N	\N	2026-05-23 18:29:04.64069+00	\N	\N	\N	2026-05-23 18:29:04.64069+00	2026-05-23 18:29:04.64069+00
19695a13-15f8-4ece-8f2d-5d42b4b96333	59e94b15-0fad-4063-a4ed-23a0403dbfbe	fd679cdb-1fc1-4d12-8fb8-1dcd6e75616e	owner	{}	active	\N	\N	\N	2026-05-23 18:29:20.446877+00	\N	\N	\N	2026-05-23 18:29:20.446877+00	2026-05-23 18:29:20.446877+00
1ab65312-6b27-4978-aefa-8e0aab8854fb	ceefa0f7-391e-4c32-b63e-f2988479113b	e62d9f00-dc7f-443d-84ed-3f69e4091de2	owner	{}	active	\N	\N	\N	2026-05-23 18:48:13.196552+00	\N	\N	\N	2026-05-23 18:48:13.196552+00	2026-05-23 18:48:13.196552+00
938ee957-f0cb-42f6-ac9b-64382e7f9614	5febfc64-85aa-442a-a649-27b9917c2b52	3481968e-1f51-4e7f-bdaf-167c07e2c2ba	owner	{}	active	\N	\N	\N	2026-05-26 12:54:39.527338+00	\N	\N	\N	2026-05-26 12:54:39.527338+00	2026-05-26 12:54:39.527338+00
4cc49bd5-423e-4db5-898d-d075067df51c	8f35302b-ee04-4eaa-86ad-f33de2280314	37cce6e4-9daa-4925-991c-7c46e01d7efe	owner	{}	active	\N	\N	\N	2026-05-26 12:54:58.849485+00	\N	\N	\N	2026-05-26 12:54:58.849485+00	2026-05-26 12:54:58.849485+00
cfdc765b-e8cb-4501-b0da-ce19c55b0a3a	9401a922-ca4e-4c36-a76d-c8b080e128ec	7540dcae-6b5c-4624-ba37-d59e28ecefe1	owner	{}	active	\N	\N	\N	2026-05-26 15:49:34.793239+00	\N	\N	\N	2026-05-26 15:49:34.793239+00	2026-05-26 15:49:34.793239+00
f72d53e3-b0c1-4d9b-ab37-e215614bdaef	c4c0c1cc-7824-4693-8155-e3fd1af56192	7ee42dca-a4bc-48e8-a842-7112797773c6	owner	{}	active	\N	\N	\N	2026-05-23 17:58:00.615175+00	\N	\N	\N	2026-05-23 17:58:00.615175+00	2026-05-26 20:54:33.873114+00
8a1056b9-330d-416d-a639-7266ee3f41b7	c4c0c1cc-7824-4693-8155-e3fd1af56192	d4e0b112-187d-45f2-a38b-0cb1cadebb01	player	{}	active	\N	\N	\N	2026-05-26 22:17:15.225288+00	\N	\N	\N	2026-05-26 22:17:15.225288+00	2026-05-26 22:17:15.225288+00
8ada2d71-eeef-4a77-9ff6-3337d6c974ba	3c19bc27-a105-4f8b-982d-e0cb01ea0524	f7d2714f-bec1-48d6-b457-1d0d530bd1da	owner	{}	active	\N	\N	\N	2026-05-26 18:09:24.277526+00	\N	\N	\N	2026-05-26 18:09:24.277526+00	2026-05-26 18:09:24.277526+00
ebd7b706-5e0f-45cb-93bc-b5fa9ffa8e05	223de646-383d-433d-a0a2-27ab0e0c8434	65c3983f-efa4-482f-9ce3-1efc9bf2c765	owner	{}	active	\N	\N	\N	2026-05-10 18:28:17.627689+00	\N	\N	\N	2026-05-10 18:28:17.627689+00	2026-05-11 19:16:51.554748+00
b1569305-bd98-4cf2-adff-96613a1837d7	2f81f295-1e7a-4874-a360-64ab0edde681	65c3983f-efa4-482f-9ce3-1efc9bf2c765	owner	{}	active	\N	\N	\N	2026-05-11 16:52:51.140403+00	\N	\N	2026-05-11 17:05:33.35451+00	2026-05-04 17:05:27.100495+00	2026-05-11 19:16:51.554748+00
f5ad3070-b9ce-48a1-8cd1-b344dde7e108	7e0569fb-c741-40df-bc2d-0b8f6f3edf15	65c3983f-efa4-482f-9ce3-1efc9bf2c765	owner	{}	active	\N	\N	\N	2026-05-04 15:41:45.888224+00	\N	\N	\N	2026-05-04 15:41:45.888224+00	2026-05-11 19:16:51.554748+00
41b08d08-53e7-4abf-bdf4-054d44ab52af	a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	4a008854-f94a-448f-8fc9-17691a933185	owner	{}	active	\N	\N	\N	2026-05-18 18:35:09.310242+00	\N	\N	\N	2026-05-18 18:35:09.310242+00	2026-05-18 18:35:09.310242+00
d14a1506-8eb5-4c18-b21d-e08e70bf7d7b	29fac061-0e2a-4184-814f-f653c89d72d9	a3cff818-78e0-40d5-9c75-4ed0c347c09d	owner	{}	active	\N	\N	\N	2026-05-18 18:35:23.146122+00	\N	\N	\N	2026-05-18 18:35:23.146122+00	2026-05-18 18:35:23.146122+00
d208b3d0-4bb8-45e9-b4d6-065177b9511d	ac767b0a-348f-4e4b-9ade-5b56cbc82c28	24c9e08f-be23-403d-b369-d5ed8c60d8d7	owner	{}	active	\N	\N	\N	2026-05-18 18:38:25.812478+00	\N	\N	\N	2026-05-18 18:38:25.812478+00	2026-05-18 18:38:25.812478+00
a3ebbd40-7a83-42b2-a1de-46d447d83c46	858577b3-5159-4b22-92e4-1efcbb9dfab6	0796735e-0f46-4143-afe1-28855541cf37	owner	{}	active	\N	\N	\N	2026-05-22 16:42:47.022584+00	\N	\N	\N	2026-05-22 16:42:47.022584+00	2026-05-22 16:42:47.022584+00
764bec71-92e7-4ee9-a23f-92e09d840c58	f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	154d34ce-dcfc-4c6a-90e7-7951d7642184	owner	{}	active	\N	\N	\N	2026-05-22 16:45:26.367019+00	\N	\N	\N	2026-05-22 16:45:26.367019+00	2026-05-22 16:45:26.367019+00
e7eaed3e-3a80-4d0f-b9b8-b354f984a618	b4896131-2292-4295-9dca-8a76eb565321	61c286e3-e085-45c4-aac5-1eeb092af44c	owner	{}	active	\N	\N	\N	2026-05-22 16:47:17.631158+00	\N	\N	\N	2026-05-22 16:47:17.631158+00	2026-05-22 16:47:17.631158+00
aa1f61bc-0ca4-40a3-9dd4-1c42b8a2d8aa	b4896131-2292-4295-9dca-8a76eb565321	2f307259-3eb6-42bc-bd1f-b5d3c565a5f0	player	{}	active	\N	\N	\N	2026-05-22 16:47:17.647011+00	\N	\N	\N	2026-05-22 16:47:17.647011+00	2026-05-22 16:47:17.647011+00
323a4936-fd92-4734-b807-2e8e3f63c5b2	9eac6b1a-302f-42d1-815e-d64120e5a494	4e520751-45ee-4376-947f-c8b5c709ced9	owner	{}	active	\N	\N	\N	2026-05-22 16:47:31.888636+00	\N	\N	\N	2026-05-22 16:47:31.888636+00	2026-05-22 16:47:31.888636+00
16aaf839-7f84-4bd0-8ed5-213a19a5ee84	9eac6b1a-302f-42d1-815e-d64120e5a494	475cf6cc-d29d-4477-b609-7079dc77f7aa	player	{}	active	\N	\N	\N	2026-05-22 16:47:31.894688+00	\N	\N	\N	2026-05-22 16:47:31.894688+00	2026-05-22 16:47:31.894688+00
708e5296-ac38-4b95-9dbe-737f22ffe7da	bf71b29d-45ad-4177-82e5-81d0500c6d7c	63314300-ec7c-4971-9012-3e0ae0d2cc37	owner	{}	active	\N	\N	\N	2026-05-22 16:47:36.196023+00	\N	\N	\N	2026-05-22 16:47:36.196023+00	2026-05-22 16:47:36.196023+00
c80d0a3f-06e3-483b-9da6-2bbc5e5edb57	2dac0366-5a26-4a81-9e14-d06741c21377	462f3e64-64f7-4469-bfce-b807f21acc36	owner	{}	active	\N	\N	\N	2026-05-23 17:25:15.606538+00	\N	\N	\N	2026-05-23 17:25:15.606538+00	2026-05-23 17:25:15.606538+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.organizations (id, name, slug, description, logo_url, cover_image_url, sport, location, address, website, email, phone, established, stripe_account_id, stripe_onboarding_complete, settings, primary_color, secondary_color, member_count, is_active, owner_id, created_at, updated_at, images, philosophy, types, is_mock, group_alias) FROM stdin;
c4c0c1cc-7824-4693-8155-e3fd1af56192	johndoe87bsssaby's Club	johndoe87bsssabys-club	\N	\N	\N	Football	\N	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	7ee42dca-a4bc-48e8-a842-7112797773c6	2026-05-23 17:58:00.615175+00	2026-05-26 22:17:15.225288+00	{}	\N	\N	f	\N
d05d8c3b-b5d9-4b93-b574-245cce1857b6	Integration Test's club	integration-tests-club-1779560944645	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	f9113420-4632-4afa-8312-f4bb05ebf5f3	2026-05-23 18:29:04.64069+00	2026-05-23 18:29:05.717504+00	{}	\N	\N	f	\N
2dac0366-5a26-4a81-9e14-d06741c21377	Integration Test's club	integration-tests-club-1779557115616	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	462f3e64-64f7-4469-bfce-b807f21acc36	2026-05-23 17:25:15.606538+00	2026-05-23 17:25:16.873735+00	{}	\N	\N	f	\N
4d3461ca-33a4-4527-b5ec-6121aa9b74b3	Flow Test Club c87e3767	flow-test-club-c87e3767	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	bd6e4ea8-2d7b-4872-be92-b42c9d5b2a52	2026-05-23 18:48:12.3159+00	2026-05-23 18:48:12.360572+00	{}	\N	{academy}	f	\N
5febfc64-85aa-442a-a649-27b9917c2b52	Integration Test's club	integration-tests-club-1779800079556	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	3481968e-1f51-4e7f-bdaf-167c07e2c2ba	2026-05-26 12:54:39.527338+00	2026-05-26 12:54:40.744398+00	{}	\N	\N	f	\N
7e0569fb-c741-40df-bc2d-0b8f6f3edf15	Christopher Callaghan t	christopher-callaghan-t		\N	\N	Football	manchester	\N		\N	\N	\N	\N	f	{}	\N	\N	1	t	65c3983f-efa4-482f-9ce3-1efc9bf2c765	2026-05-04 15:41:45.888224+00	2026-05-04 15:41:45.888224+00	{}	\N	\N	f	\N
1e029e0e-ca02-491e-b9c6-1cc6b2814835	Flow Test Club 015a6b75	flow-test-club-015a6b75	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	cd270a0b-94f4-4c3e-9a98-172e10964f6f	2026-05-26 15:49:38.259947+00	2026-05-26 15:49:38.297859+00	{}	\N	{academy}	f	\N
3c19bc27-a105-4f8b-982d-e0cb01ea0524	Integration Test's club	integration-tests-club-1779818964294	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	f7d2714f-bec1-48d6-b457-1d0d530bd1da	2026-05-26 18:09:24.277526+00	2026-05-26 18:09:25.416652+00	{}	\N	\N	f	\N
223de646-383d-433d-a0a2-27ab0e0c8434	test	test		\N	\N	Football	manchester	\N		\N	\N	\N	\N	f	{}	\N	\N	1	t	65c3983f-efa4-482f-9ce3-1efc9bf2c765	2026-05-10 18:28:17.627689+00	2026-05-10 18:28:17.627689+00	{}	\N	\N	f	\N
3a724826-9158-4084-a5ef-fb26fba01798	Flow Test Club e9f5de18	flow-test-club-e9f5de18	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	c490ebcf-7ed0-4485-b173-ce38522f919f	2026-05-23 17:37:48.154265+00	2026-05-23 17:37:48.205164+00	{}	\N	{academy}	f	\N
f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	Integration Test's club	integration-tests-club-1779468326396	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	154d34ce-dcfc-4c6a-90e7-7951d7642184	2026-05-22 16:45:26.367019+00	2026-05-22 16:45:28.061387+00	{}	\N	\N	f	\N
97a116ea-919a-4e15-b70f-db6dd9bb8508	Flow Test Club 0efab58f	flow-test-club-0efab58f	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	44c999d8-9d9b-4492-9caf-17cd0230af41	2026-05-23 18:28:34.08862+00	2026-05-23 18:28:34.14263+00	{}	\N	{academy}	f	\N
b4896131-2292-4295-9dca-8a76eb565321	Test Org 87916	test-org-87916	Temporary org for messages.test	\N	\N	Football	Local	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	61c286e3-e085-45c4-aac5-1eeb092af44c	2026-05-22 16:47:17.606394+00	2026-05-22 16:47:17.647011+00	{}	\N	\N	f	\N
2f81f295-1e7a-4874-a360-64ab0edde681	Christopher Callaghan test	christopher-callaghan-test		\N	\N	Football	manchester	\N		\N	\N	\N	\N	f	{}	\N	\N	1	t	65c3983f-efa4-482f-9ce3-1efc9bf2c765	2026-05-04 17:05:27.100495+00	2026-05-11 19:52:31.613402+00	{}	\N	\N	f	\N
9eac6b1a-302f-42d1-815e-d64120e5a494	Test Org 94302	test-org-94302	Temporary org for messages.test	\N	\N	Football	Local	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	4e520751-45ee-4376-947f-c8b5c709ced9	2026-05-22 16:47:31.878186+00	2026-05-22 16:47:31.894688+00	{}	\N	\N	f	\N
a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	Integration Test's club	integration-tests-club-1779129309324	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	4a008854-f94a-448f-8fc9-17691a933185	2026-05-18 18:35:09.310242+00	2026-05-18 18:35:10.24319+00	{}	\N	\N	f	\N
29fac061-0e2a-4184-814f-f653c89d72d9	Integration Test's club	integration-tests-club-1779129323148	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	a3cff818-78e0-40d5-9c75-4ed0c347c09d	2026-05-18 18:35:23.146122+00	2026-05-18 18:35:25.450378+00	{}	\N	\N	f	\N
ac767b0a-348f-4e4b-9ade-5b56cbc82c28	Integration Test's club	integration-tests-club-1779129505815	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	24c9e08f-be23-403d-b369-d5ed8c60d8d7	2026-05-18 18:38:25.812478+00	2026-05-18 18:38:26.737924+00	{}	\N	\N	f	\N
bf71b29d-45ad-4177-82e5-81d0500c6d7c	Integration Test's club	integration-tests-club-1779468456206	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	63314300-ec7c-4971-9012-3e0ae0d2cc37	2026-05-22 16:47:36.196023+00	2026-05-22 16:47:37.584393+00	{}	\N	\N	f	\N
858577b3-5159-4b22-92e4-1efcbb9dfab6	Integration Test's club	integration-tests-club-1779468167070	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	0796735e-0f46-4143-afe1-28855541cf37	2026-05-22 16:42:47.022584+00	2026-05-22 16:42:49.181656+00	{}	\N	\N	f	\N
81515640-9887-4466-90f1-6d23d8067b33	Flow Test Club c06f04b9	flow-test-club-c06f04b9	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	f00f7da9-3929-4c3d-b1e3-e2578b1eb585	2026-05-22 16:43:07.268348+00	2026-05-22 16:43:07.372649+00	{}	\N	{academy}	f	\N
eded4b11-7c36-43d8-9b08-e1836cd424d4	Flow Test Club 26cd2932	flow-test-club-26cd2932	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	322376b4-a55d-4718-bf0d-a6ad32756eed	2026-05-23 17:25:12.330002+00	2026-05-23 17:25:12.376087+00	{}	\N	{academy}	f	\N
796b6473-ea64-448c-abf8-ffdc1f057306	Flow Test Club 662c41f4	flow-test-club-662c41f4	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	e1399a51-679d-41b8-b9dc-9039337e6ee9	2026-05-22 16:45:16.396714+00	2026-05-22 16:45:16.556087+00	{}	\N	{academy}	f	\N
4ecdc341-dd48-43a2-81d4-e030afac7ea5	Flow Test Club c2ae7281	flow-test-club-c2ae7281	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	8afbd298-1a5c-4791-8e26-5b28b3316be8	2026-05-22 16:47:53.459944+00	2026-05-22 16:47:53.578889+00	{}	\N	{academy}	f	\N
7bd6559d-8e31-4132-a3f8-bee60797d34e	Flow Test Club d325d536	flow-test-club-d325d536	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	a4a9489c-8c04-4a08-b89f-08cdef153e73	2026-05-23 18:29:08.684046+00	2026-05-23 18:29:08.731382+00	{}	\N	{academy}	f	\N
59e94b15-0fad-4063-a4ed-23a0403dbfbe	Integration Test's club	integration-tests-club-1779560960449	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	fd679cdb-1fc1-4d12-8fb8-1dcd6e75616e	2026-05-23 18:29:20.446877+00	2026-05-23 18:29:21.317023+00	{}	\N	\N	f	\N
055e8358-9654-4c0f-b0d3-f7868c7eca0c	Integration Test's club	integration-tests-club-1779557859463	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	7ee7a4be-bb27-46e6-936e-306f2b6c5b33	2026-05-23 17:37:39.453417+00	2026-05-23 17:37:42.01699+00	{}	\N	\N	f	\N
42dc75f2-6090-46c7-8084-fb47e6499081	Flow Test Club 374679e9	flow-test-club-374679e9	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	9fddf011-204f-429b-bbab-27b13a658446	2026-05-23 18:29:25.858258+00	2026-05-23 18:29:25.922258+00	{}	\N	{academy}	f	\N
8f35302b-ee04-4eaa-86ad-f33de2280314	Integration Test's club	integration-tests-club-1779800098852	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	37cce6e4-9daa-4925-991c-7c46e01d7efe	2026-05-26 12:54:58.849485+00	2026-05-26 12:54:59.72428+00	{}	\N	\N	f	\N
9401a922-ca4e-4c36-a76d-c8b080e128ec	Integration Test's club	integration-tests-club-1779810574826	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	7540dcae-6b5c-4624-ba37-d59e28ecefe1	2026-05-26 15:49:34.793239+00	2026-05-26 15:49:36.127069+00	{}	\N	\N	f	\N
ceefa0f7-391e-4c32-b63e-f2988479113b	Integration Test's club	integration-tests-club-1779562093204	New organization created with ClubHub	\N	\N	club	To be updated	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	2	t	e62d9f00-dc7f-443d-84ed-3f69e4091de2	2026-05-23 18:48:13.196552+00	2026-05-23 18:48:14.276118+00	{}	\N	\N	f	\N
7feb9225-b434-4a5a-b9bb-bb2a81f8cdcc	Flow Test Club 73c9a6af	flow-test-club-73c9a6af	Integration Test Club	\N	\N	Football	\N	\N	\N	\N	\N	2026	\N	f	{}	\N	\N	1	t	5cc99e65-6da1-46f9-96f1-ba78d47d3a6d	2026-05-26 12:54:53.449232+00	2026-05-26 12:54:53.495501+00	{}	\N	{academy}	f	\N
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.payments (id, player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date, stripe_payment_intent_id, stripe_charge_id, created_at, updated_at, is_mock) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.plans (id, name, price, "interval", active, description, club_id, created_at, updated_at, is_mock) FROM stdin;
\.


--
-- Data for Name: player_activities; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.player_activities (id, player_id, activity_type, description, event_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: player_history; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.player_history (id, player_id, club_name, team_name, start_date, end_date, achievements, created_at) FROM stdin;
\.


--
-- Data for Name: player_plans; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.player_plans (id, user_id, plan_id, start_date, last_billing_date, next_billing_date, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: player_ratings; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.player_ratings (id, match_result_id, player_id, rating, notes, created_at, goals, assists, yellow_cards, red_cards, minutes_played) FROM stdin;
\.


--
-- Data for Name: player_skill_scores; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.player_skill_scores (id, player_id, ball_control, passing, shooting, agility, fitness, goalkeeping, tactics, updated_at) FROM stdin;
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.players (id, user_id, first_name, last_name, email, phone, date_of_birth, "position", club_id, monthly_fee, payment_status, attendance_rate, join_date, is_public, scouting_opt_in, created_at, updated_at, sport, gender, location, bio, height, goals, assists, yellow_cards, red_cards, matches_played, payment_plan_id, plan_price, plan_start_date, stripe_customer_id, stripe_subscription_id) FROM stdin;
b74d3532-b938-406d-84b5-422bb305d176	\N	Alex	Player-1779129308960	player-1779129308960@clubhub.test	07700900000	2005-06-15	Midfielder	a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	0.00	pending	0	2026-05-18 18:35:10.239645+00	f	f	2026-05-18 18:35:10.239645+00	2026-05-18 18:35:10.239645+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-18	\N	\N
d7c06eea-2407-4a7f-b001-54354c824f27	\N	Alex	Player-1779129322832	player-1779129322832@clubhub.test	07700900000	2005-06-15	Midfielder	29fac061-0e2a-4184-814f-f653c89d72d9	0.00	pending	0	2026-05-18 18:35:25.449275+00	f	f	2026-05-18 18:35:25.449275+00	2026-05-18 18:35:25.449275+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-18	\N	\N
a52f6362-98a3-4b6d-b3e5-4496d67222d1	\N	Alex	Player-1779129505477	player-1779129505477@clubhub.test	07700900000	2005-06-15	Midfielder	ac767b0a-348f-4e4b-9ade-5b56cbc82c28	0.00	pending	0	2026-05-18 18:38:26.73691+00	f	f	2026-05-18 18:38:26.73691+00	2026-05-18 18:38:26.73691+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-18	\N	\N
aacb2a26-dd25-402f-994d-1a63909f0fa0	\N	Alex	Player-1779468163736	player-1779468163736@clubhub.test	07700900000	2005-06-15	Midfielder	858577b3-5159-4b22-92e4-1efcbb9dfab6	0.00	pending	0	2026-05-22 16:42:49.175635+00	f	f	2026-05-22 16:42:49.175635+00	2026-05-22 16:42:49.175635+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-22	\N	\N
4317e050-b931-4b50-891b-e20c148eaac2	\N	Alex	Player-1779468321681	player-1779468321681@clubhub.test	07700900000	2005-06-15	Midfielder	f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	0.00	pending	0	2026-05-22 16:45:28.055152+00	f	f	2026-05-22 16:45:28.055152+00	2026-05-22 16:45:28.055152+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-22	\N	\N
c95c88c9-a706-4398-95c9-83167a679ea1	\N	Alex	Player-1779468455308	player-1779468455308@clubhub.test	07700900000	2005-06-15	Midfielder	bf71b29d-45ad-4177-82e5-81d0500c6d7c	0.00	pending	0	2026-05-22 16:47:37.581468+00	f	f	2026-05-22 16:47:37.581468+00	2026-05-22 16:47:37.581468+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-22	\N	\N
90b58295-030a-4dc5-9bd0-421af5f1fc75	\N	Alex	Player-1779557114834	player-1779557114834@clubhub.test	07700900000	2005-06-15	Midfielder	2dac0366-5a26-4a81-9e14-d06741c21377	0.00	pending	0	2026-05-23 17:25:16.870258+00	f	f	2026-05-23 17:25:16.870258+00	2026-05-23 17:25:16.870258+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-23	\N	\N
028ca067-343b-4e6e-93cd-98d7a201e716	\N	Alex	Player-1779557858642	player-1779557858642@clubhub.test	07700900000	2005-06-15	Midfielder	055e8358-9654-4c0f-b0d3-f7868c7eca0c	0.00	pending	0	2026-05-23 17:37:42.012886+00	f	f	2026-05-23 17:37:42.012886+00	2026-05-23 17:37:42.012886+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-23	\N	\N
92cbd47d-3f47-47f8-9149-c41cbeef23ad	\N	Alex	Player-1779560944266	player-1779560944266@clubhub.test	07700900000	2005-06-15	Midfielder	d05d8c3b-b5d9-4b93-b574-245cce1857b6	0.00	pending	0	2026-05-23 18:29:05.715361+00	f	f	2026-05-23 18:29:05.715361+00	2026-05-23 18:29:05.715361+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-23	\N	\N
bb16ebc5-5e44-4ffa-b4c6-9aad2be81216	\N	Alex	Player-1779560960090	player-1779560960090@clubhub.test	07700900000	2005-06-15	Midfielder	59e94b15-0fad-4063-a4ed-23a0403dbfbe	0.00	pending	0	2026-05-23 18:29:21.313905+00	f	f	2026-05-23 18:29:21.313905+00	2026-05-23 18:29:21.313905+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-23	\N	\N
81f8cab4-461a-48f3-8693-a3c5a433e8f2	\N	Alex	Player-1779562092834	player-1779562092834@clubhub.test	07700900000	2005-06-15	Midfielder	ceefa0f7-391e-4c32-b63e-f2988479113b	0.00	pending	0	2026-05-23 18:48:14.272676+00	f	f	2026-05-23 18:48:14.272676+00	2026-05-23 18:48:14.272676+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-23	\N	\N
11c98717-9edf-42c1-a1cf-07c2a9d65dc3	\N	Alex	Player-1779800078705	player-1779800078705@clubhub.test	07700900000	2005-06-15	Midfielder	5febfc64-85aa-442a-a649-27b9917c2b52	0.00	pending	0	2026-05-26 12:54:40.739812+00	f	f	2026-05-26 12:54:40.739812+00	2026-05-26 12:54:40.739812+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-26	\N	\N
328755e6-04fb-4ab3-86e4-e9b9beb65c36	\N	Alex	Player-1779800098527	player-1779800098527@clubhub.test	07700900000	2005-06-15	Midfielder	8f35302b-ee04-4eaa-86ad-f33de2280314	0.00	pending	0	2026-05-26 12:54:59.722615+00	f	f	2026-05-26 12:54:59.722615+00	2026-05-26 12:54:59.722615+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-26	\N	\N
7e9db42c-2384-4332-b0dd-8836caa0dc8f	\N	Alex	Player-1779810574265	player-1779810574265@clubhub.test	07700900000	2005-06-15	Midfielder	9401a922-ca4e-4c36-a76d-c8b080e128ec	0.00	pending	0	2026-05-26 15:49:36.124669+00	f	f	2026-05-26 15:49:36.124669+00	2026-05-26 15:49:36.124669+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-26	\N	\N
952dee64-ecdd-4465-a57b-4134efb58631	\N	Alex	Player-1779818963638	player-1779818963638@clubhub.test	07700900000	2005-06-15	Midfielder	3c19bc27-a105-4f8b-982d-e0cb01ea0524	0.00	pending	0	2026-05-26 18:09:25.414371+00	f	f	2026-05-26 18:09:25.414371+00	2026-05-26 18:09:25.414371+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	2026-05-26	\N	\N
c71908c6-8b64-45fa-bcd3-9d68e3ed0228	d4e0b112-187d-45f2-a38b-0cb1cadebb01	Christopher	Callaghan	instantonlinesuccessdsdsdsd@gmail.com	\N	2026-05-22	forward	c4c0c1cc-7824-4693-8155-e3fd1af56192	0.00	pending	0	2026-05-26 22:17:15.225288+00	f	f	2026-05-26 22:17:15.225288+00	2026-05-26 22:17:15.225288+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	\N	\N	\N
87436b52-7cc2-4cbd-bddd-c57ff435dfda	7ee42dca-a4bc-48e8-a842-7112797773c6	Christophersssssss	Callaghan	johndoe87bsssaby@gmail.com	\N	2026-05-29	strickers	c4c0c1cc-7824-4693-8155-e3fd1af56192	0.00	pending	0	2026-05-26 20:00:09.107894+00	f	f	2026-05-26 20:00:09.107894+00	2026-05-26 20:54:33.873114+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	\N	\N	\N
8e8574ae-4a47-4991-8149-869db63d624b	\N	Chris	Callaghan	payments@christopherjcallaghan.co.uk	\N	2026-04-28	sfdfds	c4c0c1cc-7824-4693-8155-e3fd1af56192	0.00	pending	0	2026-05-26 21:48:20.434142+00	f	f	2026-05-26 21:48:20.434142+00	2026-05-26 21:48:20.434142+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	\N	\N	\N
4b15c961-ee6b-49d8-8277-04db3659b4ca	\N	Christopher	Callaghan	instantonlinesuccesscdcdcdc@gmail.com	\N	2026-05-14	stricker	c4c0c1cc-7824-4693-8155-e3fd1af56192	0.00	pending	0	2026-05-26 21:51:04.204397+00	f	f	2026-05-26 21:51:04.204397+00	2026-05-26 21:51:04.204397+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	\N	\N	\N
72c9b514-a7f4-43b9-b2a5-d5046990c97f	\N	Christopher	Callaghan	instantonlinesuccessdsfsdf@gmail.com	\N	2026-05-08	stricker	c4c0c1cc-7824-4693-8155-e3fd1af56192	0.00	pending	0	2026-05-26 21:54:11.115689+00	f	f	2026-05-26 21:54:11.115689+00	2026-05-26 21:54:11.115689+00	\N	\N	\N	\N	\N	0	0	0	0	0	\N	\N	\N	\N	\N
\.


--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.poll_votes (id, poll_id, user_id, selection, created_at) FROM stdin;
\.


--
-- Data for Name: polls; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.polls (id, organization_id, club_id, title, description, options, status, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_orders; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.product_orders (id, product_id, user_id, quantity, total_amount, status, stripe_payment_intent_id, created_at, updated_at, customization_details) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.products (id, club_id, name, description, price, stock_quantity, image_url, category, is_active, created_at, updated_at, custom_fields) FROM stdin;
\.


--
-- Data for Name: referee_availability; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.referee_availability (id, referee_id, available_date, start_time, end_time, is_available, created_at) FROM stdin;
\.


--
-- Data for Name: scheduled_notifications; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.scheduled_notifications (id, event_id, notification_type, scheduled_at, status, created_at) FROM stdin;
\.


--
-- Data for Name: scout_assignments; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.scout_assignments (id, scout_id, event_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: scout_contact_requests; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.scout_contact_requests (id, scout_id, player_id, event_id, status, delay_type, notified_at, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: scout_reports; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.scout_reports (id, scout_id, player_id, team_id, event_id, report_type, data, is_draft, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scout_verification_requests; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.scout_verification_requests (id, user_id, club_id, id_card_url, club_letter_url, notes, status, admin_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.staff (id, user_id, first_name, last_name, email, phone, role, permissions, club_id, join_date, created_at, updated_at, is_active, is_verified_scout, scout_verification_status, club_verified_scout) FROM stdin;
\.


--
-- Data for Name: tactical_formations; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tactical_formations (id, name, formation_type, team_id, coach_id, formation_data, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: talent_registrations; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.talent_registrations (id, event_id, first_name, last_name, date_of_birth, email, phone, "position", height, bib_number, bib_color, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_coaches; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.team_coaches (id, team_id, coach_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_players; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.team_players (id, team_id, player_id, "position", jersey_number, created_at) FROM stdin;
ac104fdc-d45d-4c4f-ac86-6b2c9edaf57c	95a32450-4114-4e62-8049-b1e1da94046a	87436b52-7cc2-4cbd-bddd-c57ff435dfda	strickers	\N	2026-05-26 20:54:33.873114+00
40f59bea-f396-44c5-9365-5fbd3443f0b7	95a32450-4114-4e62-8049-b1e1da94046a	c71908c6-8b64-45fa-bcd3-9d68e3ed0228	\N	\N	2026-05-26 22:28:55.008031+00
3c6b3297-33ab-484f-8326-62c2e94e8024	d4217b0e-4437-4c7e-9525-654feb4c1126	c71908c6-8b64-45fa-bcd3-9d68e3ed0228	\N	\N	2026-05-26 22:29:09.803987+00
1b3fee29-3d6a-49d1-af26-c08e8daa4646	d4217b0e-4437-4c7e-9525-654feb4c1126	87436b52-7cc2-4cbd-bddd-c57ff435dfda	\N	\N	2026-05-26 22:29:09.803987+00
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.teams (id, name, age_group, sport, description, coach_id, club_id, wins, losses, draws, created_at, updated_at) FROM stdin;
95a32450-4114-4e62-8049-b1e1da94046a	Updated Team 2ss	\N	football	\N	\N	c4c0c1cc-7824-4693-8155-e3fd1af56192	0	0	0	2026-05-26 15:53:12.439488+00	2026-05-26 22:28:54.948278+00
d4217b0e-4437-4c7e-9525-654feb4c1126	testyyy	\N	Football	\N	\N	c4c0c1cc-7824-4693-8155-e3fd1af56192	0	0	0	2026-05-26 22:29:09.803987+00	2026-05-26 22:29:09.803987+00
\.


--
-- Data for Name: tournament_checkins; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_checkins (id, tournament_id, team_id, user_id, checkin_time, checkin_method, created_at) FROM stdin;
\.


--
-- Data for Name: tournament_groups; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_groups (id, stage_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tournament_match_events; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_match_events (id, match_id, team_id, player_id, player_name_manual, event_type, minute, created_at) FROM stdin;
\.


--
-- Data for Name: tournament_matches; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_matches (id, stage_id, event_id, home_team_id, away_team_id, home_team_placeholder, away_team_placeholder, home_score, away_score, status, start_time, field_location, next_match_id, progress_to_home, round_number, match_number, created_at, updated_at, pitch_id, end_time, video_url, is_video_public, video_price) FROM stdin;
\.


--
-- Data for Name: tournament_pitches; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_pitches (id, event_id, name, pitch_type, pitch_size, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tournament_stages; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_stages (id, event_id, name, type, sequence, settings, created_at, updated_at, match_duration, break_duration) FROM stdin;
\.


--
-- Data for Name: tournament_teams; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.tournament_teams (id, event_id, team_name, logo_url, contact_email, contact_phone, status, group_id, stats, created_at, updated_at, internal_team_id, current_group_id) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.user_preferences (id, user_id, current_organization_id, theme, language, timezone, email_notifications, push_notifications, preferences, created_at, updated_at) FROM stdin;
7ba2237c-425a-4999-b981-ed68c370e384	4a008854-f94a-448f-8fc9-17691a933185	a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	dark	en	UTC	t	t	{}	2026-05-18 18:35:09.310242+00	2026-05-18 18:35:09.310242+00
73a8b57f-b027-4929-8980-a8107efe2c9c	a3cff818-78e0-40d5-9c75-4ed0c347c09d	29fac061-0e2a-4184-814f-f653c89d72d9	dark	en	UTC	t	t	{}	2026-05-18 18:35:23.146122+00	2026-05-18 18:35:23.146122+00
7d2394e9-2d65-413b-87e9-91be7c38861d	24c9e08f-be23-403d-b369-d5ed8c60d8d7	ac767b0a-348f-4e4b-9ade-5b56cbc82c28	dark	en	UTC	t	t	{}	2026-05-18 18:38:25.812478+00	2026-05-18 18:38:25.812478+00
462fd3a5-214b-4c49-afe8-78cff6e436db	0796735e-0f46-4143-afe1-28855541cf37	858577b3-5159-4b22-92e4-1efcbb9dfab6	dark	en	UTC	t	t	{}	2026-05-22 16:42:47.022584+00	2026-05-22 16:42:47.022584+00
b3c85328-e8c8-490d-bf37-97e53d3ec185	154d34ce-dcfc-4c6a-90e7-7951d7642184	f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	dark	en	UTC	t	t	{}	2026-05-22 16:45:26.367019+00	2026-05-22 16:45:26.367019+00
3ff271f0-926a-4c4f-8c19-57053aaea3a8	61c286e3-e085-45c4-aac5-1eeb092af44c	b4896131-2292-4295-9dca-8a76eb565321	dark	en	UTC	t	t	{}	2026-05-22 16:47:17.649029+00	2026-05-22 16:47:17.649029+00
cb41f0e2-7d5e-456e-8777-183210441e71	4e520751-45ee-4376-947f-c8b5c709ced9	9eac6b1a-302f-42d1-815e-d64120e5a494	dark	en	UTC	t	t	{}	2026-05-22 16:47:31.896977+00	2026-05-22 16:47:31.896977+00
a9252ccc-beab-4889-bcbe-e38ac4c03ec3	63314300-ec7c-4971-9012-3e0ae0d2cc37	bf71b29d-45ad-4177-82e5-81d0500c6d7c	dark	en	UTC	t	t	{}	2026-05-22 16:47:36.196023+00	2026-05-22 16:47:36.196023+00
f86916d2-160f-43f1-8134-949d0ff839b3	462f3e64-64f7-4469-bfce-b807f21acc36	2dac0366-5a26-4a81-9e14-d06741c21377	dark	en	UTC	t	t	{}	2026-05-23 17:25:15.606538+00	2026-05-23 17:25:15.606538+00
fa802169-0659-458d-937a-a4519567ee0c	7ee7a4be-bb27-46e6-936e-306f2b6c5b33	055e8358-9654-4c0f-b0d3-f7868c7eca0c	dark	en	UTC	t	t	{}	2026-05-23 17:37:39.453417+00	2026-05-23 17:37:39.453417+00
18d5aaa8-6171-42bf-ad74-8d8b0da13712	7ee42dca-a4bc-48e8-a842-7112797773c6	c4c0c1cc-7824-4693-8155-e3fd1af56192	dark	en	UTC	t	t	{}	2026-05-23 17:58:00.615175+00	2026-05-23 17:58:00.615175+00
e4b80632-13b3-42b3-8c86-00abf7348448	f9113420-4632-4afa-8312-f4bb05ebf5f3	d05d8c3b-b5d9-4b93-b574-245cce1857b6	dark	en	UTC	t	t	{}	2026-05-23 18:29:04.64069+00	2026-05-23 18:29:04.64069+00
11ca437d-371a-4d45-accd-94d3c2391fc3	fd679cdb-1fc1-4d12-8fb8-1dcd6e75616e	59e94b15-0fad-4063-a4ed-23a0403dbfbe	dark	en	UTC	t	t	{}	2026-05-23 18:29:20.446877+00	2026-05-23 18:29:20.446877+00
993cf732-e4e8-4ef4-a047-7deab0ac5f63	e62d9f00-dc7f-443d-84ed-3f69e4091de2	ceefa0f7-391e-4c32-b63e-f2988479113b	dark	en	UTC	t	t	{}	2026-05-23 18:48:13.196552+00	2026-05-23 18:48:13.196552+00
24f8e2d2-663a-499a-8e50-350b73f74461	3481968e-1f51-4e7f-bdaf-167c07e2c2ba	5febfc64-85aa-442a-a649-27b9917c2b52	dark	en	UTC	t	t	{}	2026-05-26 12:54:39.527338+00	2026-05-26 12:54:39.527338+00
c3ee1e5e-4dea-421b-bc19-dd4d2d05a68e	37cce6e4-9daa-4925-991c-7c46e01d7efe	8f35302b-ee04-4eaa-86ad-f33de2280314	dark	en	UTC	t	t	{}	2026-05-26 12:54:58.849485+00	2026-05-26 12:54:58.849485+00
4beb4e7d-0d75-4f45-b037-1dcc7bb3aa80	7540dcae-6b5c-4624-ba37-d59e28ecefe1	9401a922-ca4e-4c36-a76d-c8b080e128ec	dark	en	UTC	t	t	{}	2026-05-26 15:49:34.793239+00	2026-05-26 15:49:34.793239+00
4c5b4de7-6725-4eea-a207-f98185e99b2d	f7d2714f-bec1-48d6-b457-1d0d530bd1da	3c19bc27-a105-4f8b-982d-e0cb01ea0524	dark	en	UTC	t	t	{}	2026-05-26 18:09:24.277526+00	2026-05-26 18:09:24.277526+00
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.user_profiles (id, user_id, date_of_birth, gender, location, sport, "position", bio, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.users (id, email, password_hash, first_name, last_name, account_type, org_types, created_at, updated_at, is_active, email_verified, is_platform_admin, reset_token, reset_expires, phone, date_of_birth, email_recovery_enabled, auto_payments_enabled, payment_reminders_enabled, receipt_emails_enabled, is_mock, completed_tours, is_verified_scout, scout_verification_status, agree_terms, agree_third_party, agree_privacy, stripe_account_id) FROM stdin;
47743922-5525-4a6f-90f3-5bd8c72791db	johndoe87baby@gmail.com	$2a$12$w1EsVU2Wny5.uyTq96YRse3iz83GDGaXd75iDYoUK24jj9rXg9icm	Christopher	Callaghan	adult	{}	2026-05-12 13:58:15.13787+00	2026-05-12 13:58:15.13787+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	t	t	t	\N
4a008854-f94a-448f-8fc9-17691a933185	test-admin-1779129308960@clubhub.test	$2a$12$AaVPyy2SInX2b/U2L3ZuaOxGmbMzdIjjvo7sXvnXuSKwHMELrWdlq	Integration	Test	organization	{club}	2026-05-18 18:35:09.310242+00	2026-05-18 18:35:09.310242+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
24c9e08f-be23-403d-b369-d5ed8c60d8d7	test-admin-1779129505477@clubhub.test	$2a$12$CdWgALVpc./Nit2yBfWuUOqjE7e/1/frGVquYGZEhfb6ZE.ZGilhK	Integration	Test	organization	{club}	2026-05-18 18:38:25.812478+00	2026-05-18 18:38:25.812478+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
f00f7da9-3929-4c3d-b1e3-e2578b1eb585	flow-admin-c06f04b9@test.com	$2a$12$7MLMeowZSDz9u1Qk6ErLqu.p46yr./3zZA2upRiXFPQeW/DzbANUq	Flow	Admin	organization	{}	2026-05-22 16:43:07.201788+00	2026-05-22 16:43:07.201788+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
37cce6e4-9daa-4925-991c-7c46e01d7efe	test-admin-1779800098527@clubhub.test	$2a$12$czZPCzphCe.xsnr7aRAbo.rVInoPibcNr1nhiLBiGYKcCSJa25.6S	Integration	Test	organization	{club}	2026-05-26 12:54:58.849485+00	2026-05-26 12:54:58.849485+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
322376b4-a55d-4718-bf0d-a6ad32756eed	flow-admin-26cd2932@test.com	$2a$12$.8tNJ3IAgVpdZ/UX80.mQ.TBfnxwkjJ.mH8sTrGD.C4MXMXkCAGji	Flow	Admin	organization	{}	2026-05-23 17:25:12.299192+00	2026-05-23 17:25:12.299192+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
462f3e64-64f7-4469-bfce-b807f21acc36	test-admin-1779557114834@clubhub.test	$2a$12$6YLOLCHmTixjvnwhwXpI0OOkI0vCDue3m/.B9xUDZmsH8D/JCOpc2	Integration	Test	organization	{club}	2026-05-23 17:25:15.606538+00	2026-05-23 17:25:15.606538+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
7540dcae-6b5c-4624-ba37-d59e28ecefe1	test-admin-1779810574265@clubhub.test	$2a$12$DWEsGBudKMD/4gDCqS8IreV9x5LZcIkMyYLJWJPiWd/tnqd6z2jc.	Integration	Test	organization	{club}	2026-05-26 15:49:34.793239+00	2026-05-26 15:49:34.793239+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
bd6e4ea8-2d7b-4872-be92-b42c9d5b2a52	flow-admin-c87e3767@test.com	$2a$12$dkH64c1uyeOe/Q7TgPHIzujDG3o5sVEw9F6r8RxXKB4EvHygS6rU2	Flow	Admin	organization	{}	2026-05-23 18:48:11.756473+00	2026-05-23 18:48:11.756473+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
3481968e-1f51-4e7f-bdaf-167c07e2c2ba	test-admin-1779800078705@clubhub.test	$2a$12$QdPsmQhYkfjInEGS0FKotOyaKDYweWZaevTyedPqbwO72TgyhUUmq	Integration	Test	organization	{club}	2026-05-26 12:54:39.527338+00	2026-05-26 12:54:39.527338+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
154d34ce-dcfc-4c6a-90e7-7951d7642184	test-admin-1779468321681@clubhub.test	$2a$12$oVhJrgplV/LzibmIQ8HFl.UUp5mOhLnmmwruPRXtl5aY1wicgpmpy	Integration	Test	organization	{club}	2026-05-22 16:45:26.367019+00	2026-05-22 16:45:26.367019+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
66d95ba5-b8cb-417d-97c2-7822afbae01d	admin@clubhub.com	$2a$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S	Demo	Admin	organization	{club,tournament,event}	2026-04-26 17:09:00.898475+00	2026-04-26 17:09:00.898475+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
44c999d8-9d9b-4492-9caf-17cd0230af41	flow-admin-0efab58f@test.com	$2a$12$aQlp7KN2g3N.XZRQVaG/r.GhXHEoXOVJV3Njo4rk6V8n7uuJXIegi	Flow	Admin	organization	{}	2026-05-23 18:28:33.377136+00	2026-05-23 18:28:33.377136+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
0fe4607c-53f2-4434-987c-094265faed06	superadmin@clubhub.com	$2a$10$fcIavHVuUQU10yNkE6YYmuUBiHMaqWPoQfahfA7vUD.UBt1hkrAUi	Super	Admin	organization	\N	2026-04-26 17:12:00.052978+00	2026-04-26 17:12:00.052978+00	t	t	t	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
4e520751-45ee-4376-947f-c8b5c709ced9	msg_test_sender_94302@example.com	$2a$12$PZ6BCukG1UkLntrmbvK17.kylG4amqLPwmNsxcoRrncTivDMbV5zC	Msg	Sender	adult	{}	2026-05-22 16:47:31.358629+00	2026-05-22 16:47:31.358629+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
475cf6cc-d29d-4477-b609-7079dc77f7aa	msg_test_recv_94302@example.com	$2a$12$et.ZO3P/3.muXazr1nec2Ooj03e0lcsPSu7vc13p209dilWuflXXy	Msg	Receiver	adult	{}	2026-05-22 16:47:31.862217+00	2026-05-22 16:47:31.862217+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
f9113420-4632-4afa-8312-f4bb05ebf5f3	test-admin-1779560944266@clubhub.test	$2a$12$gk5M1wT2NqSyZ68imxbqLezi4cxtB72Up0VtvN22D2ZkNNbVtczKy	Integration	Test	organization	{club}	2026-05-23 18:29:04.64069+00	2026-05-23 18:29:04.64069+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
f7d2714f-bec1-48d6-b457-1d0d530bd1da	test-admin-1779818963638@clubhub.test	$2a$12$El.BYR22W5rD0ajs1P.0jOg74cG882zSpA6wOZHpPNoNhK.R/AYBm	Integration	Test	organization	{club}	2026-05-26 18:09:24.277526+00	2026-05-26 18:09:24.277526+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
d4e0b112-187d-45f2-a38b-0cb1cadebb01	instantonlinesuccessdsdsdsd@gmail.com	approved-invite-no-password	Christopher	Callaghan	adult	\N	2026-05-26 22:17:15.225288+00	2026-05-26 22:17:15.225288+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
a3cff818-78e0-40d5-9c75-4ed0c347c09d	test-admin-1779129322832@clubhub.test	$2a$12$mt/rnQjfMfZeB1baXyoVX.c6u/ZXtBUftJPtwMCA/Yk/2KeM4CdYO	Integration	Test	organization	{club}	2026-05-18 18:35:23.146122+00	2026-05-18 18:35:23.146122+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
0796735e-0f46-4143-afe1-28855541cf37	test-admin-1779468163736@clubhub.test	$2a$12$47GcI5geyAyT/CTOSlUnwerXKDnLBur7EowEtp.qQJ4aiFmWFhSUu	Integration	Test	organization	{club}	2026-05-22 16:42:47.022584+00	2026-05-22 16:42:47.022584+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
e62d9f00-dc7f-443d-84ed-3f69e4091de2	test-admin-1779562092834@clubhub.test	$2a$12$PoPkWE9tAX08hF05kUu.Ce2nrKB4VBIoOLHB1daBoTV13R72DvALy	Integration	Test	organization	{club}	2026-05-23 18:48:13.196552+00	2026-05-23 18:48:13.196552+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
e1399a51-679d-41b8-b9dc-9039337e6ee9	flow-admin-662c41f4@test.com	$2a$12$Cg56gmk6rgtGU5Vmt4HC1OtJ5WI7dmf4CFZIaZh80SBLEgH3KqMky	Flow	Admin	organization	{}	2026-05-22 16:45:15.961659+00	2026-05-22 16:45:15.961659+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
5cc99e65-6da1-46f9-96f1-ba78d47d3a6d	flow-admin-73c9a6af@test.com	$2a$12$Kv.kyAftYQcOAuxKHYgdEeFt7ObUciX88Dknxxp9H9ShIjONDFIQy	Flow	Admin	organization	{}	2026-05-26 12:54:53.423132+00	2026-05-26 12:54:53.423132+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
61c286e3-e085-45c4-aac5-1eeb092af44c	msg_test_sender_87916@example.com	$2a$12$JEzFlHtquaiA17IUoZ0wCOzp/FKLbnVQGDMwx9FzLCJLzxM/2TSQm	Msg	Sender	adult	{}	2026-05-22 16:47:17.012382+00	2026-05-22 16:47:17.012382+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
2f307259-3eb6-42bc-bd1f-b5d3c565a5f0	msg_test_recv_87916@example.com	$2a$12$HZdXgn9.9Ijd/UhMKHrjhOKcYInrDHsZjFZ6NA.t.azb7DurJJEl6	Msg	Receiver	adult	{}	2026-05-22 16:47:17.594731+00	2026-05-22 16:47:17.594731+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
63314300-ec7c-4971-9012-3e0ae0d2cc37	test-admin-1779468455308@clubhub.test	$2a$12$rIo/ippQlAS1bDE35Bje4O6l5XBVxnfzfTVydNDBy5Rg7WUCxH/LC	Integration	Test	organization	{club}	2026-05-22 16:47:36.196023+00	2026-05-22 16:47:36.196023+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
7ee7a4be-bb27-46e6-936e-306f2b6c5b33	test-admin-1779557858642@clubhub.test	$2a$12$XLGpY0o/xOLizwj5E2f6FOeFVRsEvOmoJhFYqsMvj9ZniEbLb7/gW	Integration	Test	organization	{club}	2026-05-23 17:37:39.453417+00	2026-05-23 17:37:39.453417+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
8afbd298-1a5c-4791-8e26-5b28b3316be8	flow-admin-c2ae7281@test.com	$2a$12$oW8KrkrZEiMR81sKk98wJOkroi.QYyNBqW880yHaR.OF.bxx1DNba	Flow	Admin	organization	{}	2026-05-22 16:47:53.388751+00	2026-05-22 16:47:53.388751+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
65c3983f-efa4-482f-9ce3-1efc9bf2c765	instantonlinesuccess@gmail.com	$2a$12$olmqDaGI.b3.vl9KCul11.Loc7SfrR749JJAMbylR2vxhVXk.cy6u	Christopher	Callaghan	organization	{}	2026-05-04 14:23:11.047628+00	2026-05-11 14:50:42.988161+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	t	t	t	\N
c490ebcf-7ed0-4485-b173-ce38522f919f	flow-admin-e9f5de18@test.com	$2a$12$rZozKxwlYvONOnRcX01EkuoaGUf5zp91BfFhKm4T83s9CKk4MaPxe	Flow	Admin	organization	{}	2026-05-23 17:37:48.125163+00	2026-05-23 17:37:48.125163+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
cd270a0b-94f4-4c3e-9a98-172e10964f6f	flow-admin-015a6b75@test.com	$2a$12$ouv.kU4V2pNb7bvJ91/bGuuP52WOwI4RIsyps3T2YIOSQXDtSr.VC	Flow	Admin	organization	{}	2026-05-26 15:49:38.221944+00	2026-05-26 15:49:38.221944+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
a4a9489c-8c04-4a08-b89f-08cdef153e73	flow-admin-d325d536@test.com	$2a$12$LvNQz0jrTDe2iouLj8X4helWhPJPR5HAtIzKRU894qvF25mGBuOZu	Flow	Admin	organization	{}	2026-05-23 18:29:08.101937+00	2026-05-23 18:29:08.101937+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
fd679cdb-1fc1-4d12-8fb8-1dcd6e75616e	test-admin-1779560960090@clubhub.test	$2a$12$5YUlz/qZWhEF19n4Tw96YudncTW1R46D1dpSqRT5Ci.PQGvIhDi82	Integration	Test	organization	{club}	2026-05-23 18:29:20.446877+00	2026-05-23 18:29:20.446877+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
9fddf011-204f-429b-bbab-27b13a658446	flow-admin-374679e9@test.com	$2a$12$Zs4mH0efRhw6Ho1jb.D63euWzeyWtEKRmCSTTMQJD/ewGK7JYpnPi	Flow	Admin	organization	{}	2026-05-23 18:29:25.227641+00	2026-05-23 18:29:25.227641+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	f	f	f	\N
7ee42dca-a4bc-48e8-a842-7112797773c6	johndoe87bsssaby@gmail.com	$2a$12$lQqtWK7Tu28GYVZB/cgoWu1XdVzouMlPFd/lvisHta9Eb.tai.TI.	Christophersssssss	Callaghan	adult	{}	2026-05-23 17:57:55.565958+00	2026-05-26 20:54:33.873114+00	t	t	f	\N	\N	\N	\N	t	f	t	t	f	[]	f	unverified	t	t	t	\N
\.


--
-- Data for Name: venue_availability; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.venue_availability (id, venue_id, day_of_week, start_time, end_time, is_available, created_at) FROM stdin;
\.


--
-- Data for Name: venue_bookings; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.venue_bookings (id, venue_id, user_id, organization_id, start_time, end_time, status, total_cost, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: venue_checkins; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.venue_checkins (id, venue_id, booking_id, user_id, checkin_time, checkin_method, created_at) FROM stdin;
\.


--
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: clubhub_dev_db_user
--

COPY public.venues (id, organization_id, name, location, description, capacity, facilities, hourly_rate, image_url, is_active, created_at, updated_at, entry_price, stripe_product_id) FROM stdin;
be537dd5-c8ff-4035-b844-56d9f04f34e8	a8f43ae9-ed71-4ce3-b3ff-bbc547c64df2	Test Stadium 1779129308960	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-18 18:35:10.280114	2026-05-18 18:35:10.280114	0.00	\N
82edfec3-9411-4e5f-8b1f-baf3c7888635	29fac061-0e2a-4184-814f-f653c89d72d9	Test Stadium 1779129322832	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-18 18:35:25.469939	2026-05-18 18:35:25.469939	0.00	\N
67d2a782-8ed4-4ad0-ab2e-fd1b2005cbbe	ac767b0a-348f-4e4b-9ade-5b56cbc82c28	Test Stadium 1779129505477	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-18 18:38:26.76565	2026-05-18 18:38:26.76565	0.00	\N
d87efa9a-b715-4552-a851-76068aafee0a	858577b3-5159-4b22-92e4-1efcbb9dfab6	Test Stadium 1779468163736	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-22 16:42:49.267724	2026-05-22 16:42:49.267724	0.00	\N
713e1419-d442-41af-bfd5-037fa2d86908	f8e7d1d6-2a7b-40f8-a988-1dc625ab003a	Test Stadium 1779468321681	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-22 16:45:28.152896	2026-05-22 16:45:28.152896	0.00	\N
48c58eb1-e6a2-4419-b6df-b41bea3f7388	bf71b29d-45ad-4177-82e5-81d0500c6d7c	Test Stadium 1779468455308	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-22 16:47:37.653417	2026-05-22 16:47:37.653417	0.00	\N
9c706bc4-cab9-45ee-a76d-ac18a2e02730	2dac0366-5a26-4a81-9e14-d06741c21377	Test Stadium 1779557114834	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-23 17:25:16.917378	2026-05-23 17:25:16.917378	0.00	\N
b1af331b-adcc-43f7-bd59-bee2e891639c	055e8358-9654-4c0f-b0d3-f7868c7eca0c	Test Stadium 1779557858642	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-23 17:37:42.059567	2026-05-23 17:37:42.059567	0.00	\N
e60adec1-4eec-4d53-9d2a-171674c321ce	d05d8c3b-b5d9-4b93-b574-245cce1857b6	Test Stadium 1779560944266	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-23 18:29:05.795106	2026-05-23 18:29:05.795106	0.00	\N
c7841fea-c3d1-4a6e-be4d-75f6e0736ebe	59e94b15-0fad-4063-a4ed-23a0403dbfbe	Test Stadium 1779560960090	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-23 18:29:21.378507	2026-05-23 18:29:21.378507	0.00	\N
98e74fee-fb29-4a8d-9a99-1a96059f7d90	ceefa0f7-391e-4c32-b63e-f2988479113b	Test Stadium 1779562092834	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-23 18:48:14.344157	2026-05-23 18:48:14.344157	0.00	\N
78ecc16c-22a7-490a-b89a-ab98444247bb	5febfc64-85aa-442a-a649-27b9917c2b52	Test Stadium 1779800078705	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-26 12:54:40.803312	2026-05-26 12:54:40.803312	0.00	\N
b565a8c4-ef7d-4c2f-8ed5-dfdb2bc1a62e	8f35302b-ee04-4eaa-86ad-f33de2280314	Test Stadium 1779800098527	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-26 12:54:59.747075	2026-05-26 12:54:59.747075	0.00	\N
580eb4d1-6c64-4613-b165-fe435335d167	9401a922-ca4e-4c36-a76d-c8b080e128ec	Test Stadium 1779810574265	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-26 15:49:36.163337	2026-05-26 15:49:36.163337	0.00	\N
39a665fc-fb91-4a62-8f7e-cb5e35b4ad69	c4c0c1cc-7824-4693-8155-e3fd1af56192	gygygy	jhgjgj	\N	22	[]	22.00	\N	t	2026-05-26 17:58:09.170797	2026-05-26 17:58:09.170797	22.00	\N
c02e1725-7a14-40c6-991d-9926154c8e44	3c19bc27-a105-4f8b-982d-e0cb01ea0524	Test Stadium 1779818963638	\N	Integration test venue	500	[]	0.00	\N	t	2026-05-26 18:09:25.458166	2026-05-26 18:09:25.458166	0.00	\N
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: clubhub_dev_db_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 53, true);


--
-- Name: availability_responses availability_responses_event_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.availability_responses
    ADD CONSTRAINT availability_responses_event_id_player_id_key UNIQUE (event_id, player_id);


--
-- Name: availability_responses availability_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.availability_responses
    ADD CONSTRAINT availability_responses_pkey PRIMARY KEY (id);


--
-- Name: bib_inventory bib_inventory_club_id_color_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.bib_inventory
    ADD CONSTRAINT bib_inventory_club_id_color_key UNIQUE (club_id, color);


--
-- Name: bib_inventory bib_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.bib_inventory
    ADD CONSTRAINT bib_inventory_pkey PRIMARY KEY (id);


--
-- Name: bibs bibs_club_id_color_number_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.bibs
    ADD CONSTRAINT bibs_club_id_color_number_key UNIQUE (club_id, color, number);


--
-- Name: bibs bibs_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.bibs
    ADD CONSTRAINT bibs_pkey PRIMARY KEY (id);


--
-- Name: camp_bibs camp_bibs_event_id_bib_number_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_bibs
    ADD CONSTRAINT camp_bibs_event_id_bib_number_key UNIQUE (event_id, bib_number);


--
-- Name: camp_bibs camp_bibs_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_bibs
    ADD CONSTRAINT camp_bibs_pkey PRIMARY KEY (id);


--
-- Name: camp_groups camp_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_groups
    ADD CONSTRAINT camp_groups_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: club_applications club_applications_club_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_applications
    ADD CONSTRAINT club_applications_club_id_user_id_key UNIQUE (club_id, user_id);


--
-- Name: club_applications club_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_applications
    ADD CONSTRAINT club_applications_pkey PRIMARY KEY (id);


--
-- Name: club_reviews club_reviews_club_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_reviews
    ADD CONSTRAINT club_reviews_club_id_user_id_key UNIQUE (club_id, user_id);


--
-- Name: club_reviews club_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_reviews
    ADD CONSTRAINT club_reviews_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: custom_form_fields custom_form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_form_fields
    ADD CONSTRAINT custom_form_fields_pkey PRIMARY KEY (id);


--
-- Name: custom_form_responses custom_form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_form_responses
    ADD CONSTRAINT custom_form_responses_pkey PRIMARY KEY (id);


--
-- Name: custom_forms custom_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_forms
    ADD CONSTRAINT custom_forms_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: drill_assignments drill_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_assignments
    ADD CONSTRAINT drill_assignments_pkey PRIMARY KEY (id);


--
-- Name: drill_reviews drill_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_reviews
    ADD CONSTRAINT drill_reviews_pkey PRIMARY KEY (id);


--
-- Name: drill_submissions drill_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_submissions
    ADD CONSTRAINT drill_submissions_pkey PRIMARY KEY (id);


--
-- Name: drills drills_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drills
    ADD CONSTRAINT drills_pkey PRIMARY KEY (id);


--
-- Name: event_bookings event_bookings_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: event_bookings event_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_pkey PRIMARY KEY (id);


--
-- Name: event_checkins event_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_checkins
    ADD CONSTRAINT event_checkins_pkey PRIMARY KEY (id);


--
-- Name: event_group_players event_group_players_group_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_group_players
    ADD CONSTRAINT event_group_players_group_id_player_id_key UNIQUE (group_id, player_id);


--
-- Name: event_group_players event_group_players_group_id_talent_registration_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_group_players
    ADD CONSTRAINT event_group_players_group_id_talent_registration_id_key UNIQUE (group_id, talent_registration_id);


--
-- Name: event_group_players event_group_players_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_group_players
    ADD CONSTRAINT event_group_players_pkey PRIMARY KEY (id);


--
-- Name: event_groups event_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_groups
    ADD CONSTRAINT event_groups_pkey PRIMARY KEY (id);


--
-- Name: event_invitations event_invitations_event_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_event_id_player_id_key UNIQUE (event_id, player_id);


--
-- Name: event_invitations event_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_pkey PRIMARY KEY (id);


--
-- Name: event_players event_players_event_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_players
    ADD CONSTRAINT event_players_event_id_player_id_key UNIQUE (event_id, player_id);


--
-- Name: event_players event_players_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_players
    ADD CONSTRAINT event_players_pkey PRIMARY KEY (id);


--
-- Name: event_reminder_log event_reminder_log_event_id_lead_time_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_reminder_log
    ADD CONSTRAINT event_reminder_log_event_id_lead_time_key UNIQUE (event_id, lead_time);


--
-- Name: event_reminder_log event_reminder_log_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_reminder_log
    ADD CONSTRAINT event_reminder_log_pkey PRIMARY KEY (id);


--
-- Name: event_schedules event_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_schedules
    ADD CONSTRAINT event_schedules_pkey PRIMARY KEY (id);


--
-- Name: event_teams event_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT event_teams_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: fixtures fixtures_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_pkey PRIMARY KEY (id);


--
-- Name: guest_submissions guest_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.guest_submissions
    ADD CONSTRAINT guest_submissions_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_organization_id_email_status_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_organization_id_email_status_key UNIQUE (organization_id, email, status);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: league_pitches league_pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.league_pitches
    ADD CONSTRAINT league_pitches_pkey PRIMARY KEY (id);


--
-- Name: league_teams league_teams_league_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.league_teams
    ADD CONSTRAINT league_teams_league_id_team_id_key UNIQUE (league_id, team_id);


--
-- Name: league_teams league_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.league_teams
    ADD CONSTRAINT league_teams_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_pkey PRIMARY KEY (id);


--
-- Name: listing_applications listing_applications_listing_id_applicant_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listing_applications
    ADD CONSTRAINT listing_applications_listing_id_applicant_id_key UNIQUE (listing_id, applicant_id);


--
-- Name: listing_applications listing_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listing_applications
    ADD CONSTRAINT listing_applications_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: match_events match_events_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_event_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_event_id_key UNIQUE (event_id);


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_jersey_number_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_jersey_number_key UNIQUE (organization_id, jersey_number);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: organizations organizations_stripe_account_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_stripe_account_id_key UNIQUE (stripe_account_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: player_activities player_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_activities
    ADD CONSTRAINT player_activities_pkey PRIMARY KEY (id);


--
-- Name: player_history player_history_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_history
    ADD CONSTRAINT player_history_pkey PRIMARY KEY (id);


--
-- Name: player_plans player_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_plans
    ADD CONSTRAINT player_plans_pkey PRIMARY KEY (id);


--
-- Name: player_plans player_plans_user_id_plan_id_is_active_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_plans
    ADD CONSTRAINT player_plans_user_id_plan_id_is_active_key UNIQUE (user_id, plan_id, is_active);


--
-- Name: player_ratings player_ratings_match_result_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_ratings
    ADD CONSTRAINT player_ratings_match_result_id_player_id_key UNIQUE (match_result_id, player_id);


--
-- Name: player_ratings player_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_ratings
    ADD CONSTRAINT player_ratings_pkey PRIMARY KEY (id);


--
-- Name: player_skill_scores player_skill_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_skill_scores
    ADD CONSTRAINT player_skill_scores_pkey PRIMARY KEY (id);


--
-- Name: player_skill_scores player_skill_scores_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_skill_scores
    ADD CONSTRAINT player_skill_scores_player_id_key UNIQUE (player_id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_poll_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_poll_id_user_id_key UNIQUE (poll_id, user_id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);


--
-- Name: product_orders product_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.product_orders
    ADD CONSTRAINT product_orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: referee_availability referee_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.referee_availability
    ADD CONSTRAINT referee_availability_pkey PRIMARY KEY (id);


--
-- Name: referee_availability referee_availability_referee_id_available_date_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.referee_availability
    ADD CONSTRAINT referee_availability_referee_id_available_date_key UNIQUE (referee_id, available_date);


--
-- Name: scheduled_notifications scheduled_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scheduled_notifications
    ADD CONSTRAINT scheduled_notifications_pkey PRIMARY KEY (id);


--
-- Name: scout_assignments scout_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_assignments
    ADD CONSTRAINT scout_assignments_pkey PRIMARY KEY (id);


--
-- Name: scout_assignments scout_assignments_scout_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_assignments
    ADD CONSTRAINT scout_assignments_scout_id_event_id_key UNIQUE (scout_id, event_id);


--
-- Name: scout_contact_requests scout_contact_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_contact_requests
    ADD CONSTRAINT scout_contact_requests_pkey PRIMARY KEY (id);


--
-- Name: scout_reports scout_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_reports
    ADD CONSTRAINT scout_reports_pkey PRIMARY KEY (id);


--
-- Name: scout_verification_requests scout_verification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_verification_requests
    ADD CONSTRAINT scout_verification_requests_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: tactical_formations tactical_formations_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tactical_formations
    ADD CONSTRAINT tactical_formations_pkey PRIMARY KEY (id);


--
-- Name: talent_registrations talent_registrations_event_id_email_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.talent_registrations
    ADD CONSTRAINT talent_registrations_event_id_email_key UNIQUE (event_id, email);


--
-- Name: talent_registrations talent_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.talent_registrations
    ADD CONSTRAINT talent_registrations_pkey PRIMARY KEY (id);


--
-- Name: team_coaches team_coaches_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_coaches
    ADD CONSTRAINT team_coaches_pkey PRIMARY KEY (id);


--
-- Name: team_players team_players_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_pkey PRIMARY KEY (id);


--
-- Name: team_players team_players_team_id_jersey_number_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_jersey_number_key UNIQUE (team_id, jersey_number);


--
-- Name: team_players team_players_team_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_player_id_key UNIQUE (team_id, player_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: tournament_checkins tournament_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_checkins
    ADD CONSTRAINT tournament_checkins_pkey PRIMARY KEY (id);


--
-- Name: tournament_groups tournament_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_groups
    ADD CONSTRAINT tournament_groups_pkey PRIMARY KEY (id);


--
-- Name: tournament_match_events tournament_match_events_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_match_events
    ADD CONSTRAINT tournament_match_events_pkey PRIMARY KEY (id);


--
-- Name: tournament_matches tournament_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pkey PRIMARY KEY (id);


--
-- Name: tournament_pitches tournament_pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_pitches
    ADD CONSTRAINT tournament_pitches_pkey PRIMARY KEY (id);


--
-- Name: tournament_stages tournament_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT tournament_stages_pkey PRIMARY KEY (id);


--
-- Name: tournament_teams tournament_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: venue_availability venue_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_availability
    ADD CONSTRAINT venue_availability_pkey PRIMARY KEY (id);


--
-- Name: venue_bookings venue_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_pkey PRIMARY KEY (id);


--
-- Name: venue_checkins venue_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_checkins
    ADD CONSTRAINT venue_checkins_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: idx_club_applications_club_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_club_applications_club_id ON public.club_applications USING btree (club_id);


--
-- Name: idx_club_applications_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_club_applications_user_id ON public.club_applications USING btree (user_id);


--
-- Name: idx_drill_assignments_drill_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_assignments_drill_id ON public.drill_assignments USING btree (drill_id);


--
-- Name: idx_drill_assignments_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_assignments_player_id ON public.drill_assignments USING btree (assigned_to_player_id);


--
-- Name: idx_drill_assignments_team_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_assignments_team_id ON public.drill_assignments USING btree (assigned_to_team_id);


--
-- Name: idx_drill_reviews_coach_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_reviews_coach_id ON public.drill_reviews USING btree (coach_id);


--
-- Name: idx_drill_reviews_submission_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_reviews_submission_id ON public.drill_reviews USING btree (submission_id);


--
-- Name: idx_drill_submissions_drill_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_submissions_drill_id ON public.drill_submissions USING btree (drill_id);


--
-- Name: idx_drill_submissions_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_submissions_player_id ON public.drill_submissions USING btree (player_id);


--
-- Name: idx_drill_submissions_status; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drill_submissions_status ON public.drill_submissions USING btree (status);


--
-- Name: idx_drills_category; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drills_category ON public.drills USING btree (category);


--
-- Name: idx_drills_coach_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drills_coach_id ON public.drills USING btree (coach_id);


--
-- Name: idx_drills_org_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_drills_org_id ON public.drills USING btree (org_id);


--
-- Name: idx_event_bookings_event_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_event_bookings_event_id ON public.event_bookings USING btree (event_id);


--
-- Name: idx_event_bookings_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_event_bookings_user_id ON public.event_bookings USING btree (user_id);


--
-- Name: idx_event_checkins_event; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_event_checkins_event ON public.event_checkins USING btree (event_id);


--
-- Name: idx_event_checkins_user; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_event_checkins_user ON public.event_checkins USING btree (user_id);


--
-- Name: idx_event_players_event_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_event_players_event_id ON public.event_players USING btree (event_id);


--
-- Name: idx_event_players_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_event_players_player_id ON public.event_players USING btree (player_id);


--
-- Name: idx_event_teams_event_team; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE UNIQUE INDEX idx_event_teams_event_team ON public.event_teams USING btree (event_id, team_id);


--
-- Name: idx_events_club_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_events_club_id ON public.events USING btree (club_id);


--
-- Name: idx_events_date; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_events_date ON public.events USING btree (event_date);


--
-- Name: idx_events_team_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_events_team_id ON public.events USING btree (team_id);


--
-- Name: idx_fixtures_league; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_fixtures_league ON public.fixtures USING btree (league_id);


--
-- Name: idx_fixtures_referee; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_fixtures_referee ON public.fixtures USING btree (referee_id);


--
-- Name: idx_fixtures_teams; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_fixtures_teams ON public.fixtures USING btree (home_team_id, away_team_id);


--
-- Name: idx_guest_submissions_email; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_guest_submissions_email ON public.guest_submissions USING btree (email);


--
-- Name: idx_guest_submissions_event; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_guest_submissions_event ON public.guest_submissions USING btree (event_id);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_expires; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_invitations_expires ON public.invitations USING btree (expires_at);


--
-- Name: idx_invitations_org_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_invitations_org_id ON public.invitations USING btree (organization_id);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_league_pitches_league; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_league_pitches_league ON public.league_pitches USING btree (league_id);


--
-- Name: idx_league_teams_league; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_league_teams_league ON public.league_teams USING btree (league_id);


--
-- Name: idx_league_teams_team; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_league_teams_team ON public.league_teams USING btree (team_id);


--
-- Name: idx_leagues_organization; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_leagues_organization ON public.leagues USING btree (organization_id);


--
-- Name: idx_listing_applications_applicant_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_listing_applications_applicant_id ON public.listing_applications USING btree (applicant_id);


--
-- Name: idx_listing_applications_listing_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_listing_applications_listing_id ON public.listing_applications USING btree (listing_id);


--
-- Name: idx_listings_active; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_listings_active ON public.listings USING btree (is_active);


--
-- Name: idx_listings_club_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_listings_club_id ON public.listings USING btree (club_id);


--
-- Name: idx_listings_type; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_listings_type ON public.listings USING btree (listing_type);


--
-- Name: idx_match_events_fixture; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_match_events_fixture ON public.match_events USING btree (fixture_id);


--
-- Name: idx_messages_organization; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_messages_organization ON public.messages USING btree (organization_id);


--
-- Name: idx_messages_receiver; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_org_members_org_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_org_members_org_id ON public.organization_members USING btree (organization_id);


--
-- Name: idx_org_members_role; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_org_members_role ON public.organization_members USING btree (role);


--
-- Name: idx_org_members_status; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_org_members_status ON public.organization_members USING btree (status);


--
-- Name: idx_org_members_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id);


--
-- Name: idx_org_members_user_org; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_org_members_user_org ON public.organization_members USING btree (user_id, organization_id);


--
-- Name: idx_organizations_active; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_organizations_active ON public.organizations USING btree (is_active);


--
-- Name: idx_organizations_images; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_organizations_images ON public.organizations USING gin (images);


--
-- Name: idx_organizations_owner_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_organizations_owner_id ON public.organizations USING btree (owner_id);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_organizations_stripe_account; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_organizations_stripe_account ON public.organizations USING btree (stripe_account_id);


--
-- Name: idx_payments_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_payments_player_id ON public.payments USING btree (player_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_payments_status ON public.payments USING btree (payment_status);


--
-- Name: idx_player_activities_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_player_activities_player_id ON public.player_activities USING btree (player_id);


--
-- Name: idx_player_activities_type; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_player_activities_type ON public.player_activities USING btree (activity_type);


--
-- Name: idx_player_history_player; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_player_history_player ON public.player_history USING btree (player_id);


--
-- Name: idx_player_history_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_player_history_player_id ON public.player_history USING btree (player_id);


--
-- Name: idx_player_skill_scores_player_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_player_skill_scores_player_id ON public.player_skill_scores USING btree (player_id);


--
-- Name: idx_players_email_club; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_players_email_club ON public.players USING btree (email, club_id);


--
-- Name: idx_players_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_players_user_id ON public.players USING btree (user_id);


--
-- Name: idx_poll_votes_poll; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_poll_votes_poll ON public.poll_votes USING btree (poll_id);


--
-- Name: idx_polls_org; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_polls_org ON public.polls USING btree (organization_id);


--
-- Name: idx_referee_availability_referee; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_referee_availability_referee ON public.referee_availability USING btree (referee_id);


--
-- Name: idx_staff_club_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_staff_club_id ON public.staff USING btree (club_id);


--
-- Name: idx_staff_user_club; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_staff_user_club ON public.staff USING btree (user_id, club_id);


--
-- Name: idx_team_coaches_team_coach; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_team_coaches_team_coach ON public.team_coaches USING btree (team_id, coach_id);


--
-- Name: idx_teams_club_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_teams_club_id ON public.teams USING btree (club_id);


--
-- Name: idx_teams_coach_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_teams_coach_id ON public.teams USING btree (coach_id);


--
-- Name: idx_tournament_checkins_tournament; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_tournament_checkins_tournament ON public.tournament_checkins USING btree (tournament_id);


--
-- Name: idx_tournament_pitches_event_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_tournament_pitches_event_id ON public.tournament_pitches USING btree (event_id);


--
-- Name: idx_user_prefs_current_org; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_user_prefs_current_org ON public.user_preferences USING btree (current_organization_id);


--
-- Name: idx_user_prefs_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_user_prefs_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE UNIQUE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_users_platform_admin; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_users_platform_admin ON public.users USING btree (is_platform_admin) WHERE (is_platform_admin = true);


--
-- Name: idx_users_reset_token; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_users_reset_token ON public.users USING btree (reset_token) WHERE (reset_token IS NOT NULL);


--
-- Name: idx_venue_availability_venue; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_venue_availability_venue ON public.venue_availability USING btree (venue_id);


--
-- Name: idx_venue_bookings_time; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_venue_bookings_time ON public.venue_bookings USING btree (start_time, end_time);


--
-- Name: idx_venue_bookings_user; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_venue_bookings_user ON public.venue_bookings USING btree (user_id);


--
-- Name: idx_venue_bookings_venue; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_venue_bookings_venue ON public.venue_bookings USING btree (venue_id);


--
-- Name: idx_venue_checkins_venue; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_venue_checkins_venue ON public.venue_checkins USING btree (venue_id);


--
-- Name: idx_venues_organization; Type: INDEX; Schema: public; Owner: clubhub_dev_db_user
--

CREATE INDEX idx_venues_organization ON public.venues USING btree (organization_id);


--
-- Name: organization_members trigger_organization_members_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER trigger_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_organization_members_updated_at();


--
-- Name: organizations trigger_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER trigger_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_organizations_updated_at();


--
-- Name: organizations trigger_sync_org_to_club; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER trigger_sync_org_to_club AFTER INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.sync_org_to_club();


--
-- Name: organization_members trigger_update_member_count; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER trigger_update_member_count AFTER INSERT OR DELETE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_organization_member_count();


--
-- Name: user_preferences trigger_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER trigger_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_preferences_updated_at();


--
-- Name: availability_responses update_availability_responses_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_availability_responses_updated_at BEFORE UPDATE ON public.availability_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bib_inventory update_bib_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_bib_inventory_updated_at BEFORE UPDATE ON public.bib_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bibs update_bibs_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_bibs_updated_at BEFORE UPDATE ON public.bibs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaigns update_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: club_applications update_club_applications_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_club_applications_updated_at BEFORE UPDATE ON public.club_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clubs update_clubs_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_forms update_custom_forms_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_custom_forms_updated_at BEFORE UPDATE ON public.custom_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_bookings update_event_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_event_bookings_updated_at BEFORE UPDATE ON public.event_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_group_players update_event_group_players_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_event_group_players_updated_at BEFORE UPDATE ON public.event_group_players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_groups update_event_groups_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_event_groups_updated_at BEFORE UPDATE ON public.event_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_schedules update_event_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_event_schedules_updated_at BEFORE UPDATE ON public.event_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: players update_players_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_orders update_product_orders_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_product_orders_updated_at BEFORE UPDATE ON public.product_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff update_staff_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tactical_formations update_tactical_formations_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_tactical_formations_updated_at BEFORE UPDATE ON public.tactical_formations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: talent_registrations update_talent_registrations_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_talent_registrations_updated_at BEFORE UPDATE ON public.talent_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournament_groups update_tournament_groups_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_tournament_groups_updated_at BEFORE UPDATE ON public.tournament_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournament_matches update_tournament_matches_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_tournament_matches_updated_at BEFORE UPDATE ON public.tournament_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournament_pitches update_tournament_pitches_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_tournament_pitches_updated_at BEFORE UPDATE ON public.tournament_pitches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournament_stages update_tournament_stages_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_tournament_stages_updated_at BEFORE UPDATE ON public.tournament_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournament_teams update_tournament_teams_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_tournament_teams_updated_at BEFORE UPDATE ON public.tournament_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: clubhub_dev_db_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: availability_responses availability_responses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.availability_responses
    ADD CONSTRAINT availability_responses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: availability_responses availability_responses_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.availability_responses
    ADD CONSTRAINT availability_responses_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: bib_inventory bib_inventory_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.bib_inventory
    ADD CONSTRAINT bib_inventory_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: bibs bibs_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.bibs
    ADD CONSTRAINT bibs_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: camp_bibs camp_bibs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_bibs
    ADD CONSTRAINT camp_bibs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: camp_bibs camp_bibs_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_bibs
    ADD CONSTRAINT camp_bibs_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: camp_groups camp_groups_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_groups
    ADD CONSTRAINT camp_groups_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: camp_groups camp_groups_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.camp_groups
    ADD CONSTRAINT camp_groups_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_target_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_target_team_id_fkey FOREIGN KEY (target_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: club_applications club_applications_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_applications
    ADD CONSTRAINT club_applications_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: club_applications club_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_applications
    ADD CONSTRAINT club_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: club_applications club_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_applications
    ADD CONSTRAINT club_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_reviews club_reviews_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_reviews
    ADD CONSTRAINT club_reviews_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: club_reviews club_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.club_reviews
    ADD CONSTRAINT club_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: clubs clubs_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: custom_form_fields custom_form_fields_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_form_fields
    ADD CONSTRAINT custom_form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.custom_forms(id) ON DELETE CASCADE;


--
-- Name: custom_form_responses custom_form_responses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_form_responses
    ADD CONSTRAINT custom_form_responses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: custom_form_responses custom_form_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_form_responses
    ADD CONSTRAINT custom_form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.custom_forms(id) ON DELETE CASCADE;


--
-- Name: custom_form_responses custom_form_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_form_responses
    ADD CONSTRAINT custom_form_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: custom_forms custom_forms_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.custom_forms
    ADD CONSTRAINT custom_forms_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: documents documents_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: documents documents_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: drill_assignments drill_assignments_assigned_by_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_assignments
    ADD CONSTRAINT drill_assignments_assigned_by_coach_id_fkey FOREIGN KEY (assigned_by_coach_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drill_assignments drill_assignments_assigned_to_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_assignments
    ADD CONSTRAINT drill_assignments_assigned_to_player_id_fkey FOREIGN KEY (assigned_to_player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: drill_assignments drill_assignments_assigned_to_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_assignments
    ADD CONSTRAINT drill_assignments_assigned_to_team_id_fkey FOREIGN KEY (assigned_to_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: drill_assignments drill_assignments_drill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_assignments
    ADD CONSTRAINT drill_assignments_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES public.drills(id) ON DELETE CASCADE;


--
-- Name: drill_reviews drill_reviews_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_reviews
    ADD CONSTRAINT drill_reviews_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: drill_reviews drill_reviews_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_reviews
    ADD CONSTRAINT drill_reviews_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.drill_submissions(id) ON DELETE CASCADE;


--
-- Name: drill_submissions drill_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_submissions
    ADD CONSTRAINT drill_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.drill_assignments(id) ON DELETE SET NULL;


--
-- Name: drill_submissions drill_submissions_drill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_submissions
    ADD CONSTRAINT drill_submissions_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES public.drills(id) ON DELETE CASCADE;


--
-- Name: drill_submissions drill_submissions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drill_submissions
    ADD CONSTRAINT drill_submissions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: drills drills_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drills
    ADD CONSTRAINT drills_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drills drills_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.drills
    ADD CONSTRAINT drills_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: event_bookings event_bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_bookings event_bookings_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: event_bookings event_bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_checkins event_checkins_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_checkins
    ADD CONSTRAINT event_checkins_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_checkins event_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_checkins
    ADD CONSTRAINT event_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_group_players event_group_players_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_group_players
    ADD CONSTRAINT event_group_players_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.event_groups(id) ON DELETE CASCADE;


--
-- Name: event_group_players event_group_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_group_players
    ADD CONSTRAINT event_group_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: event_group_players event_group_players_talent_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_group_players
    ADD CONSTRAINT event_group_players_talent_registration_id_fkey FOREIGN KEY (talent_registration_id) REFERENCES public.talent_registrations(id) ON DELETE CASCADE;


--
-- Name: event_groups event_groups_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_groups
    ADD CONSTRAINT event_groups_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: event_groups event_groups_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_groups
    ADD CONSTRAINT event_groups_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_invitations event_invitations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: event_invitations event_invitations_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: event_players event_players_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_players
    ADD CONSTRAINT event_players_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_players event_players_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_players
    ADD CONSTRAINT event_players_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.camp_groups(id) ON DELETE SET NULL;


--
-- Name: event_players event_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_players
    ADD CONSTRAINT event_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: event_reminder_log event_reminder_log_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_reminder_log
    ADD CONSTRAINT event_reminder_log_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_schedules event_schedules_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_schedules
    ADD CONSTRAINT event_schedules_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_teams event_teams_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT event_teams_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_teams event_teams_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT event_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: events events_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_custom_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_custom_form_id_fkey FOREIGN KEY (custom_form_id) REFERENCES public.custom_forms(id) ON DELETE SET NULL;


--
-- Name: events events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: fixtures fixtures_away_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id);


--
-- Name: fixtures fixtures_home_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id);


--
-- Name: fixtures fixtures_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: fixtures fixtures_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.users(id);


--
-- Name: guest_submissions guest_submissions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.guest_submissions
    ADD CONSTRAINT guest_submissions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id);


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: invitations invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_payment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_payment_plan_id_fkey FOREIGN KEY (payment_plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;


--
-- Name: invitations invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: league_pitches league_pitches_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.league_pitches
    ADD CONSTRAINT league_pitches_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: league_teams league_teams_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.league_teams
    ADD CONSTRAINT league_teams_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: league_teams league_teams_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.league_teams
    ADD CONSTRAINT league_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: leagues leagues_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: listing_applications listing_applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listing_applications
    ADD CONSTRAINT listing_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: listing_applications listing_applications_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listing_applications
    ADD CONSTRAINT listing_applications_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_applications listing_applications_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listing_applications
    ADD CONSTRAINT listing_applications_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: listings listings_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: listings listings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: listings listings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: match_events match_events_fixture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;


--
-- Name: match_events match_events_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: match_events match_events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: match_results match_results_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: match_results match_results_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: messages messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: payments payments_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: payments payments_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: plans plans_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: player_activities player_activities_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_activities
    ADD CONSTRAINT player_activities_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: player_activities player_activities_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_activities
    ADD CONSTRAINT player_activities_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_history player_history_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_history
    ADD CONSTRAINT player_history_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_plans player_plans_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_plans
    ADD CONSTRAINT player_plans_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: player_plans player_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_plans
    ADD CONSTRAINT player_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_ratings player_ratings_match_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_ratings
    ADD CONSTRAINT player_ratings_match_result_id_fkey FOREIGN KEY (match_result_id) REFERENCES public.match_results(id) ON DELETE CASCADE;


--
-- Name: player_ratings player_ratings_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_ratings
    ADD CONSTRAINT player_ratings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_skill_scores player_skill_scores_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.player_skill_scores
    ADD CONSTRAINT player_skill_scores_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: players players_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: players players_payment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_payment_plan_id_fkey FOREIGN KEY (payment_plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;


--
-- Name: players players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: polls polls_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: polls polls_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: product_orders product_orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.product_orders
    ADD CONSTRAINT product_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_orders product_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.product_orders
    ADD CONSTRAINT product_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: products products_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: referee_availability referee_availability_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.referee_availability
    ADD CONSTRAINT referee_availability_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_notifications scheduled_notifications_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scheduled_notifications
    ADD CONSTRAINT scheduled_notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: scout_assignments scout_assignments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_assignments
    ADD CONSTRAINT scout_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: scout_assignments scout_assignments_scout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_assignments
    ADD CONSTRAINT scout_assignments_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scout_contact_requests scout_contact_requests_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_contact_requests
    ADD CONSTRAINT scout_contact_requests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: scout_contact_requests scout_contact_requests_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_contact_requests
    ADD CONSTRAINT scout_contact_requests_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: scout_contact_requests scout_contact_requests_scout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_contact_requests
    ADD CONSTRAINT scout_contact_requests_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scout_reports scout_reports_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_reports
    ADD CONSTRAINT scout_reports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: scout_reports scout_reports_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_reports
    ADD CONSTRAINT scout_reports_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: scout_reports scout_reports_scout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_reports
    ADD CONSTRAINT scout_reports_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scout_reports scout_reports_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_reports
    ADD CONSTRAINT scout_reports_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: scout_verification_requests scout_verification_requests_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_verification_requests
    ADD CONSTRAINT scout_verification_requests_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: scout_verification_requests scout_verification_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.scout_verification_requests
    ADD CONSTRAINT scout_verification_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff staff_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tactical_formations tactical_formations_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tactical_formations
    ADD CONSTRAINT tactical_formations_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: tactical_formations tactical_formations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tactical_formations
    ADD CONSTRAINT tactical_formations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: talent_registrations talent_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.talent_registrations
    ADD CONSTRAINT talent_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: team_coaches team_coaches_coach_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_coaches
    ADD CONSTRAINT team_coaches_coach_id_fk FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_coaches team_coaches_team_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_coaches
    ADD CONSTRAINT team_coaches_team_id_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_players team_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: team_players team_players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: teams teams_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: tournament_checkins tournament_checkins_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_checkins
    ADD CONSTRAINT tournament_checkins_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: tournament_checkins tournament_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_checkins
    ADD CONSTRAINT tournament_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tournament_groups tournament_groups_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_groups
    ADD CONSTRAINT tournament_groups_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.tournament_stages(id) ON DELETE CASCADE;


--
-- Name: tournament_match_events tournament_match_events_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_match_events
    ADD CONSTRAINT tournament_match_events_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.tournament_matches(id) ON DELETE CASCADE;


--
-- Name: tournament_match_events tournament_match_events_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_match_events
    ADD CONSTRAINT tournament_match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: tournament_match_events tournament_match_events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_match_events
    ADD CONSTRAINT tournament_match_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_away_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.tournament_teams(id) ON DELETE SET NULL;


--
-- Name: tournament_matches tournament_matches_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_home_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.tournament_teams(id) ON DELETE SET NULL;


--
-- Name: tournament_matches tournament_matches_next_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_next_match_id_fkey FOREIGN KEY (next_match_id) REFERENCES public.tournament_matches(id) ON DELETE SET NULL;


--
-- Name: tournament_matches tournament_matches_pitch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pitch_id_fkey FOREIGN KEY (pitch_id) REFERENCES public.tournament_pitches(id) ON DELETE SET NULL;


--
-- Name: tournament_matches tournament_matches_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.tournament_stages(id) ON DELETE CASCADE;


--
-- Name: tournament_pitches tournament_pitches_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_pitches
    ADD CONSTRAINT tournament_pitches_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tournament_stages tournament_stages_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT tournament_stages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tournament_teams tournament_teams_current_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_current_group_id_fkey FOREIGN KEY (current_group_id) REFERENCES public.tournament_groups(id) ON DELETE SET NULL;


--
-- Name: tournament_teams tournament_teams_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tournament_teams tournament_teams_internal_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_internal_team_id_fkey FOREIGN KEY (internal_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: user_preferences user_preferences_current_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_current_organization_id_fkey FOREIGN KEY (current_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: venue_availability venue_availability_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_availability
    ADD CONSTRAINT venue_availability_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: venue_checkins venue_checkins_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_checkins
    ADD CONSTRAINT venue_checkins_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.venue_bookings(id) ON DELETE CASCADE;


--
-- Name: venue_checkins venue_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_checkins
    ADD CONSTRAINT venue_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: venue_checkins venue_checkins_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venue_checkins
    ADD CONSTRAINT venue_checkins_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: venues venues_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clubhub_dev_db_user
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict quProbgMqs3o2OhzhO2XEhpjbBX3VRw1E0o0b86uWKBhxNlJgHhGXWc955Qiy2h

