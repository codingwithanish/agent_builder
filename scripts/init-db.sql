-- Initialize Agent Builder Database

-- Create database if it doesn't exist
-- Note: This is handled by Docker environment variables

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS agent_builder;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
SET search_path TO agent_builder, public;

-- Create basic tables that might be needed by the services
-- These are examples - actual schema should be defined by the services

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    configuration JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id),
    target_platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    configuration JSONB,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    action VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);
CREATE INDEX IF NOT EXISTS idx_agents_organization ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_deployments_agent ON deployments(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON audit.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON audit.activity_log(entity_type, entity_id);

-- Insert a default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'admin@agentbuilder.local', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- bcrypt hash of 'admin123'
    'Admin',
    'User',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Create a default organization
INSERT INTO organizations (name, description, created_by)
SELECT 'Default Organization', 'Default organization for Agent Builder', id
FROM users WHERE email = 'admin@agentbuilder.local'
ON CONFLICT DO NOTHING;

COMMIT;