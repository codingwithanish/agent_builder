-- Sample Data for Agent Builder Services
-- This file provides additional dummy data for development and testing

-- Additional sample flows
INSERT INTO flows (id, name, description, llm_name, nodes, edges, status) VALUES 
('flow-1', 'Customer Support Bot', 'Automated customer support workflow with sentiment analysis', 'Claude-Primary', 
 '[{"id":"n1","type":"input","data":{"label":"Customer Query"}},{"id":"n2","type":"agent","data":{"name":"Sentiment Analyzer"}},{"id":"n3","type":"condition","data":{"condition":"sentiment === positive"}},{"id":"n4","type":"agent","data":{"name":"Support Agent"}},{"id":"n5","type":"output","data":{"label":"Response"}}]',
 '[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"},{"id":"e3","source":"n3","target":"n4"},{"id":"e4","source":"n4","target":"n5"}]',
 'deployed'),
('flow-2', 'Data Analysis Pipeline', 'Automated data processing and analysis workflow', 'Claude-Primary',
 '[{"id":"n1","type":"input","data":{"label":"Raw Data"}},{"id":"n2","type":"tool","data":{"name":"Data Cleaner"}},{"id":"n3","type":"agent","data":{"name":"Data Analyst"}},{"id":"n4","type":"tool","data":{"name":"Chart Generator"}},{"id":"n5","type":"output","data":{"label":"Analysis Report"}}]',
 '[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"},{"id":"e3","source":"n3","target":"n4"},{"id":"e4","source":"n4","target":"n5"}]',
 'draft'),
('flow-3', 'Content Moderation', 'AI-powered content moderation system', 'Claude-Primary',
 '[{"id":"n1","type":"input","data":{"label":"User Content"}},{"id":"n2","type":"agent","data":{"name":"Content Moderator"}},{"id":"n3","type":"condition","data":{"condition":"safe === true"}},{"id":"n4","type":"output","data":{"label":"Approved"}},{"id":"n5","type":"human","data":{"label":"Manual Review"}}]',
 '[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"},{"id":"e3","source":"n3","target":"n4"},{"id":"e4","source":"n3","target":"n5"}]',
 'deployed'),
('flow-4', 'Email Automation', 'Smart email response and categorization system', 'Claude-Primary',
 '[{"id":"n1","type":"input","data":{"label":"Incoming Email"}},{"id":"n2","type":"agent","data":{"name":"Email Classifier"}},{"id":"n3","type":"condition","data":{"condition":"category === urgent"}},{"id":"n4","type":"tool","data":{"name":"Alert System"}},{"id":"n5","type":"agent","data":{"name":"Auto Responder"}}]',
 '[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"},{"id":"e3","source":"n3","target":"n4"},{"id":"e4","source":"n3","target":"n5"}]',
 'failed')
ON CONFLICT (id) DO NOTHING;

-- Additional LLM configurations
INSERT INTO llm_configs (id, name, model, api_key_masked, api_key_encrypted, created_at) VALUES
('llm-gpt4', 'GPT-4 Primary', 'openai:gpt-4', '***key***', 'dummy-encrypted-gpt4-key', NOW()),
('llm-claude', 'Claude Sonnet', 'anthropic:claude-3-sonnet', '***key***', 'dummy-encrypted-claude-key', NOW()),
('llm-gemini', 'Gemini Pro', 'google:gemini-pro', '***key***', 'dummy-encrypted-gemini-key', NOW())
ON CONFLICT (name) DO NOTHING;

-- Additional catalog items
INSERT INTO catalog_items (id, kind, name, description, status, version, author, tags) VALUES
('cat-1', 'agent', 'Code Reviewer', 'AI agent for comprehensive code review and suggestions', 'deployed', '1.0.0', 'dev@company.com', '["code", "review", "quality"]'),
('cat-2', 'tool', 'Slack Integration', 'Tool for Slack notifications and messaging', 'deployed', '2.1.0', 'dev@company.com', '["slack", "notifications", "communication"]'),
('cat-3', 'agent', 'Document Summarizer', 'AI agent that creates concise summaries of long documents', 'deployed', '1.2.0', 'ai-team@company.com', '["nlp", "summarization", "documents"]'),
('cat-4', 'tool', 'Database Query Tool', 'Tool for executing safe database queries', 'draft', '0.9.0', 'data-team@company.com', '["database", "sql", "queries"]'),
('cat-5', 'agent', 'Translation Assistant', 'Multi-language translation and localization agent', 'deployed', '2.0.0', 'ai-team@company.com', '["translation", "i18n", "languages"]'),
('cat-6', 'tool', 'File Processor', 'Tool for processing various file formats (PDF, CSV, JSON)', 'deployed', '1.5.0', 'dev@company.com', '["files", "processing", "conversion"]')
ON CONFLICT (id) DO NOTHING;

-- Additional marketplace items
INSERT INTO marketplace_items (id, kind, name, description, version, author, downloads, rating, tags, category, license, created_at) VALUES
('ma3', 'agent', 'SEO Content Optimizer', 'AI agent that optimizes content for search engines', '1.3.0', 'seo@marketplace.com', 750, 4.4, '["seo", "content", "optimization"]', 'marketing', 'MIT', NOW()),
('ma4', 'tool', 'MCP-Calendar', 'Calendar integration tool for scheduling and event management', '1.1.0', 'tools@marketplace.com', 920, 4.6, '["calendar", "scheduling", "events"]', 'productivity', 'Apache-2.0', NOW()),
('ma5', 'agent', 'Financial Analyzer', 'AI agent for financial data analysis and reporting', '2.2.0', 'fintech@marketplace.com', 1300, 4.9, '["finance", "analysis", "reporting"]', 'finance', 'MIT', NOW()),
('ma6', 'tool', 'MCP-Weather', 'Weather data integration tool', '0.8.0', 'weather@marketplace.com', 450, 4.2, '["weather", "api", "data"]', 'data', 'MIT', NOW()),
('ma7', 'agent', 'Social Media Manager', 'AI agent for managing social media posts and engagement', '1.7.0', 'social@marketplace.com', 980, 4.5, '["social-media", "automation", "marketing"]', 'marketing', 'GPL-3.0', NOW()),
('ma8', 'tool', 'MCP-Logger', 'Advanced logging and monitoring tool', '3.0.0', 'logging@marketplace.com', 1500, 4.8, '["logging", "monitoring", "debugging"]', 'development', 'Apache-2.0', NOW())
ON CONFLICT (id) DO NOTHING;

-- Additional resources (uploaded files)
INSERT INTO resources (id, name, filename, size, kind, file_path, created_at) VALUES
('res-1', 'Custom Support Agent', 'support-agent-v2.mcp', 2048, 'agent', '/uploads/agents/support-agent-v2.mcp', NOW()),
('res-2', 'Data Validation Tool', 'data-validator.mcp', 1536, 'tool', '/uploads/tools/data-validator.mcp', NOW()),
('res-3', 'Marketing Assistant', 'marketing-bot.mcp', 3072, 'agent', '/uploads/agents/marketing-bot.mcp', NOW()),
('res-4', 'API Testing Tool', 'api-tester.mcp', 1024, 'tool', '/uploads/tools/api-tester.mcp', NOW()),
('res-5', 'Code Documentation Agent', 'doc-generator.mcp', 2560, 'agent', '/uploads/agents/doc-generator.mcp', NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample deployment records
INSERT INTO deployments (id, flow_id, status, started_at, completed_at, deployment_data) VALUES
('dep-1', 'flow-1', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes', '{"region": "us-east-1", "instances": 2}'),
('dep-2', 'flow-3', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', '{"region": "us-west-2", "instances": 1}'),
('dep-3', 'flow-2', 'failed', NOW() - INTERVAL '30 minutes', NULL, '{"region": "us-east-1", "error": "Insufficient resources"}'),
('dep-4', 'flow-4', 'running', NOW() - INTERVAL '10 minutes', NULL, '{"region": "eu-west-1", "instances": 3}')
ON CONFLICT (id) DO NOTHING;

-- Update flow statuses based on deployments
UPDATE flows SET status = 'deployed' WHERE id IN ('flow-1', 'flow-3');
UPDATE flows SET status = 'failed' WHERE id = 'flow-4';

COMMIT;