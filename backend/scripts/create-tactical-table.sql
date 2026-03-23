-- Create tactical_formations table
CREATE TABLE IF NOT EXISTS public.tactical_formations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    coach_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    formation character varying(50) NOT NULL,
    lineup jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER update_tactical_formations_updated_at
    BEFORE UPDATE ON public.tactical_formations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tactical_org ON public.tactical_formations(organization_id);
CREATE INDEX IF NOT EXISTS idx_tactical_team ON public.tactical_formations(team_id);
