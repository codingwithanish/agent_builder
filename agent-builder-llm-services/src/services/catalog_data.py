"""Default catalog data for agent builder."""

# Catalog agents
CATALOG_AGENTS = [
    {'id': 'ca1', 'kind': 'agent', 'name': 'Text Summarizer', 'description': 'Summarizes long text content'},
    {'id': 'ca2', 'kind': 'agent', 'name': 'Data Analyzer', 'description': 'Analyzes data patterns and trends'},
    {'id': 'ca3', 'kind': 'agent', 'name': 'Content Moderator', 'description': 'Reviews and moderates user-generated content'},
    {'id': 'ca4', 'kind': 'agent', 'name': 'Language Translator', 'description': 'Translates text between multiple languages'},
    {'id': 'ca5', 'kind': 'agent', 'name': 'Code Reviewer', 'description': 'Analyzes and reviews code for best practices'},
    {'id': 'ca6', 'kind': 'agent', 'name': 'Meeting Assistant', 'description': 'Takes notes and summarizes meetings'},
]

# Catalog tools
CATALOG_TOOLS = [
    {'id': 'ct1', 'kind': 'tool', 'name': 'Email Sender', 'description': 'Sends emails via SMTP'},
    {'id': 'ct2', 'kind': 'tool', 'name': 'File Parser', 'description': 'Parses various file formats'},
    {'id': 'ct3', 'kind': 'tool', 'name': 'Database Connector', 'description': 'Connects to SQL and NoSQL databases'},
    {'id': 'ct4', 'kind': 'tool', 'name': 'API Gateway', 'description': 'Routes and manages API requests'},
    {'id': 'ct5', 'kind': 'tool', 'name': 'Image Processor', 'description': 'Resizes and optimizes images'},
    {'id': 'ct6', 'kind': 'tool', 'name': 'Webhook Handler', 'description': 'Receives and processes webhooks'},
    {'id': 'ct7', 'kind': 'tool', 'name': 'PDF Generator', 'description': 'Creates PDF documents from templates'},
    {'id': 'ct8', 'kind': 'tool', 'name': 'Calendar Sync', 'description': 'Syncs events with calendar services'},
    {'id': 'ct9', 'kind': 'tool', 'name': 'Git Tool', 'description': 'Git operations for version control and repository management'},
]


def get_all_catalog_items():
    """Get all catalog items combined."""
    return CATALOG_AGENTS + CATALOG_TOOLS
