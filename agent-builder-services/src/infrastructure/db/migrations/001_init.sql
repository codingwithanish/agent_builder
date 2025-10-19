-- Agent Builder Services Database Schema

-- Create flows table
CREATE TABLE IF NOT EXISTS flows (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(25) NOT NULL,
    description TEXT,
    llm_name VARCHAR(255) NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'deploying', 'deployed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on flows
CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
CREATE INDEX IF NOT EXISTS idx_flows_created_at ON flows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flows_llm_name ON flows(llm_name);

-- Create llm_configs table
CREATE TABLE IF NOT EXISTS llm_configs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    model VARCHAR(255) NOT NULL,
    api_key_masked VARCHAR(255) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on llm_configs
CREATE INDEX IF NOT EXISTS idx_llm_configs_name ON llm_configs(name);
CREATE INDEX IF NOT EXISTS idx_llm_configs_model ON llm_configs(model);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('agent', 'tool', 'unknown')),
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on resources
CREATE INDEX IF NOT EXISTS idx_resources_kind ON resources(kind);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS catalog_items (
    id VARCHAR(255) PRIMARY KEY,
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('agent', 'tool')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'deploying', 'deployed', 'failed')),
    version VARCHAR(50),
    author VARCHAR(255),
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on catalog_items
CREATE INDEX IF NOT EXISTS idx_catalog_items_kind ON catalog_items(kind);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
CREATE INDEX IF NOT EXISTS idx_catalog_items_created_at ON catalog_items(created_at DESC);

-- Create marketplace_items table
CREATE TABLE IF NOT EXISTS marketplace_items (
    id VARCHAR(255) PRIMARY KEY,
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('agent', 'tool')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    author VARCHAR(255),
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    tags JSONB DEFAULT '[]',
    category VARCHAR(100),
    license VARCHAR(100),
    documentation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on marketplace_items
CREATE INDEX IF NOT EXISTS idx_marketplace_items_kind ON marketplace_items(kind);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_downloads ON marketplace_items(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_rating ON marketplace_items(rating DESC);

-- Create deployments table for tracking deployment history
CREATE TABLE IF NOT EXISTS deployments (
    id VARCHAR(255) PRIMARY KEY,
    flow_id VARCHAR(255) NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    deployment_data JSONB
);

-- Create index on deployments
CREATE INDEX IF NOT EXISTS idx_deployments_flow_id ON deployments(flow_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_started_at ON deployments(started_at DESC);

-- Insert default LLM configuration if not exists
INSERT INTO llm_configs (id, name, model, api_key_masked, api_key_encrypted, created_at)
VALUES ('llm-default', 'Claude-Primary', 'bedrock:claude-v3', '***key***', 'dummy-encrypted-key', NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert sample marketplace items
INSERT INTO marketplace_items (id, kind, name, description, version, author, downloads, rating, tags, category, license, created_at)
VALUES 
    ('ma1', 'agent', 'Advanced Summarizer', 'AI agent that summarizes text content with customizable length', '2.1.0', 'marketplace@example.com', 1250, 4.8, '["nlp", "summarization", "ai"]', 'nlp', 'MIT', NOW()),
    ('ma2', 'agent', 'Sentiment Analyzer', 'Analyzes emotional tone and sentiment in text', '1.5.0', 'marketplace@example.com', 890, 4.6, '["nlp", "sentiment", "analysis"]', 'nlp', 'MIT', NOW()),
    ('mt1', 'tool', 'MCP-Email', 'Email integration tool for sending and receiving emails', '1.0.0', 'marketplace@example.com', 850, 4.5, '["email", "integration"]', 'communication', 'MIT', NOW()),
    ('mt2', 'tool', 'MCP-Database', 'Database connectivity tool for querying and updating data', '2.0.0', 'marketplace@example.com', 1100, 4.7, '["database", "sql", "integration"]', 'data', 'Apache-2.0', NOW())
ON CONFLICT (id) DO NOTHING;