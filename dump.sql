--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clubs; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.clubs OWNER TO postgres;

--
-- Name: event_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    player_id uuid,
    booking_status character varying(20) DEFAULT 'pending'::character varying,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    amount_paid numeric(10,2) DEFAULT 0,
    booked_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_bookings_booking_status_check CHECK (((booking_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT event_bookings_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.event_bookings OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['training'::character varying, 'match'::character varying, 'tournament'::character varying, 'camp'::character varying, 'social'::character varying, 'talent-id'::character varying])::text[])))
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT payments_payment_type_check CHECK (((payment_type)::text = ANY ((ARRAY['monthly_fee'::character varying, 'event_booking'::character varying, 'registration'::character varying, 'equipment'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: players; Type: TABLE; Schema: public; Owner: postgres
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
    attendance_rate integer DEFAULT 85,
    join_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT players_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['paid'::character varying, 'pending'::character varying, 'overdue'::character varying])::text[])))
);


ALTER TABLE public.players OWNER TO postgres;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT staff_role_check CHECK (((role)::text = ANY ((ARRAY['coach'::character varying, 'assistant-coach'::character varying, 'treasurer'::character varying, 'coaching-supervisor'::character varying, 'referee'::character varying, 'administrator'::character varying])::text[])))
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: team_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid NOT NULL,
    "position" character varying(50),
    jersey_number integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_players OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT users_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['adult'::character varying, 'organization'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: clubs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clubs (id, name, description, location, philosophy, website, types, sport, owner_id, member_count, established, created_at, updated_at) FROM stdin;
17bb223a-2ca4-49e4-8fea-00abeaafa6a6	aaa aaa's event	New organization created with ClubHub	To be updated	adwd	https://aadaw.com	{club}	football	f1fdbaf8-fae8-4cad-803d-05e5e3ff95ed	1	2025	2025-06-21 05:09:13.204787+01	2025-07-07 08:19:34.084126+01
\.


--
-- Data for Name: event_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_bookings (id, event_id, user_id, player_id, booking_status, payment_status, amount_paid, booked_at, updated_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, team_id, opponent, created_by, created_at, updated_at) FROM stdin;
375919b0-a85e-445f-902f-e2fd79e607e0	first event	the first event	match	2001-11-11	11:15:00	\N	10.00	50	50	17bb223a-2ca4-49e4-8fea-00abeaafa6a6	\N	\N	f1fdbaf8-fae8-4cad-803d-05e5e3ff95ed	2025-07-03 06:24:06.453206+01	2025-07-03 06:24:06.453206+01
528d1195-dc68-4b85-8fd3-4fd90cace150	second event	gdrg	training	2001-11-11	11:11:00	\N	0.00	22	22	17bb223a-2ca4-49e4-8fea-00abeaafa6a6	\N	\N	f1fdbaf8-fae8-4cad-803d-05e5e3ff95ed	2025-07-03 06:34:55.453826+01	2025-07-03 06:34:55.453826+01
921ceca4-bc38-4069-8a86-1db847592db0	awdwd	awddw	camp	2025-07-02	11:11:00	\N	0.00	22	22	17bb223a-2ca4-49e4-8fea-00abeaafa6a6	\N	\N	f1fdbaf8-fae8-4cad-803d-05e5e3ff95ed	2025-07-03 06:40:34.139305+01	2025-07-03 06:40:34.139305+01
7ddccaa5-0f8e-403f-88cb-55831cd15978	training 1	adawd	training	2025-07-05	11:15:00	\N	0.00	22	22	17bb223a-2ca4-49e4-8fea-00abeaafa6a6	\N	\N	f1fdbaf8-fae8-4cad-803d-05e5e3ff95ed	2025-07-03 07:53:32.115391+01	2025-07-03 07:53:32.115391+01
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.players (id, user_id, first_name, last_name, email, phone, date_of_birth, "position", club_id, monthly_fee, payment_status, attendance_rate, join_date, created_at, updated_at) FROM stdin;
259f1190-fba0-4d68-b1ca-ec8c3ea58931	73b8cdc0-e15a-473c-92f1-4348b58f2919	john	smith	ccc@ccc.ccc	07532345433	2011-01-01	\N	17bb223a-2ca4-49e4-8fea-00abeaafa6a6	50.00	pending	85	2025-07-07 08:57:07.250676+01	2025-07-07 08:57:07.250676+01	2025-07-07 08:57:07.250676+01
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff (id, user_id, first_name, last_name, email, phone, role, permissions, club_id, join_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_players (id, team_id, player_id, "position", jersey_number, created_at) FROM stdin;
dbba557c-d719-481d-bc09-c8ffb4258e4e	030aee0f-5414-4ff6-ba72-9add68e9b24e	259f1190-fba0-4d68-b1ca-ec8c3ea58931	RW	7	2025-07-07 08:58:23.605642+01
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, age_group, sport, description, coach_id, club_id, wins, losses, draws, created_at, updated_at) FROM stdin;
030aee0f-5414-4ff6-ba72-9add68e9b24e	pro elite	U12	football	the first team	\N	17bb223a-2ca4-49e4-8fea-00abeaafa6a6	0	0	0	2025-07-07 08:42:05.886667+01	2025-07-07 08:42:05.886667+01
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, first_name, last_name, account_type, org_types, created_at, updated_at, is_active) FROM stdin;
f1fdbaf8-fae8-4cad-803d-05e5e3ff95ed	aaa@aaa.aaa	$2a$12$NT.JMrinqzIqAn7faUN9p.Pcji7ZxPReaCYRy4R5PadqZ/U4he61S	aaa	aaa	organization	{event}	2025-06-21 05:09:13.204787+01	2025-06-21 05:09:13.204787+01	t
63f6da36-497f-46a1-aea4-c0c5d541f2ca	bbb@bbb.bbb	$2a$12$9kRkrciOq1.X1bYROwj8hu0fjZkwfAal44M7.z7rgOGEM5PsB8we6	bbb	bbb	adult	{}	2025-06-21 05:31:32.488398+01	2025-06-21 05:31:32.488398+01	t
73b8cdc0-e15a-473c-92f1-4348b58f2919	ccc@ccc.ccc	$2a$12$1h6OjtF/n5ynWsvkvPgAWefj8ZhYlTTH3EUsojY1Foo1NeZc.jfI6	john	smith	adult	{}	2025-07-07 08:45:02.970694+01	2025-07-07 08:45:02.970694+01	t
\.


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: event_bookings event_bookings_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: event_bookings event_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: team_players team_players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_pkey PRIMARY KEY (id);


--
-- Name: team_players team_players_team_id_jersey_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_jersey_number_key UNIQUE (team_id, jersey_number);


--
-- Name: team_players team_players_team_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_player_id_key UNIQUE (team_id, player_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_bookings event_bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_bookings event_bookings_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: event_bookings event_bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_bookings
    ADD CONSTRAINT event_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: payments payments_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: payments payments_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: players players_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: players players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff staff_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_players team_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: team_players team_players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: teams teams_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

