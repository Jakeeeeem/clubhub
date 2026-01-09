-- Unified Account System Migration
-- Phase 1: Create new tables for organization-based system

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ORGANIZATIONS TABLE (replaces clubs with enhanced features)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- URL-friendly: elite-fc
    description TEXT,
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    sport VARCHAR(100),
    location VARCHAR(255),
    address TEXT,
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    established VARCHAR(4),
    
    -- Stripe integration
    stripe_account_id VARCHAR(255) UNIQUE,
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Branding
    primary_color VARCHAR(7),  -- #FF3333
    secondary_color VARCHAR(7),
    
    -- Metadata
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. ORGANIZATION MEMBERS (The core of the new system)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role-based access
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'owner',              -- Full control, can delete organization
        'admin',              -- Manage everything except deletion
        'coach',              -- Manage teams, players, events
        'assistant_coach',    -- Limited team management
        'player',             -- Player access
        'parent',             -- Parent/guardian access
        'staff',              -- General staff (treasurer, etc.)
        'viewer'              -- Read-only access (scouts, etc.)
    )),
    
    -- Custom permissions (JSONB for flexibility)
    permissions JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active',
        'inactive',
        'suspended',
        'pending'  -- Invited but not yet accepted
    )),
    
    -- Player-specific fields (when role = 'player')
    position VARCHAR(50),
    jersey_number INTEGER,
    date_of_birth DATE,
    
    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, user_id),
    UNIQUE(organization_id, jersey_number)
);

-- ============================================================================
-- 3. INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    
    -- Invitation details
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,  -- Optional personal message
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'accepted',
        'declined',
        'expired',
        'cancelled'
    )),
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(organization_id, email, status)  -- One pending invite per email per org
);

-- ============================================================================
-- 4. USER PREFERENCES (for organization switching)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Last selected organization
    current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- UI preferences
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Other preferences
    preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account ON organizations(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- Organization Members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- User Preferences
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_current_org ON user_preferences(current_organization_id);

-- ============================================================================
-- TRIGGERS for auto-updating timestamps
-- ============================================================================

-- Organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();

-- Organization Members
CREATE OR REPLACE FUNCTION update_organization_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_members_updated_at();

-- User Preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- TRIGGER: Update organization member count
-- ============================================================================
CREATE OR REPLACE FUNCTION update_organization_member_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_count
    AFTER INSERT OR DELETE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_member_count();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE organizations IS 'Organizations (clubs) that users can belong to';
COMMENT ON TABLE organization_members IS 'User memberships in organizations with roles';
COMMENT ON TABLE invitations IS 'Pending invitations to join organizations';
COMMENT ON TABLE user_preferences IS 'User preferences including current organization';

COMMENT ON COLUMN organization_members.role IS 'User role within the organization';
COMMENT ON COLUMN organization_members.permissions IS 'Custom permissions as JSON';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation acceptance';
