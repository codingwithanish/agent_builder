import { Router } from 'express';
import { FlowController } from '../controllers/flowController';
import { LlmController } from '../controllers/llmController';
import { AIChatController } from '../controllers/aiChatController';

export function createRoutes(dependencies: {
  flowController: FlowController;
  llmController: LlmController;
  aiChatController: AIChatController;
}): Router {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // API status
  router.get('/api/status', (req, res) => {
    res.json({
      api_version: 'v1',
      supported_models: [
        'bedrock:claude-v3',
        'bedrock:claude-v3.5',
        'openai:gpt-4',
        'openai:gpt-3.5-turbo'
      ],
      max_file_size: 52428800,
      rate_limits: {
        general: '100/min',
        upload: '10/min',
        llm_test: '5/min'
      }
    });
  });

  // Flow routes
  router.get('/flows', dependencies.flowController.listFlows.bind(dependencies.flowController));
  router.get('/flows/:id', dependencies.flowController.getFlow.bind(dependencies.flowController));
  router.post('/flows', dependencies.flowController.createFlow.bind(dependencies.flowController));
  router.put('/flows/:id', dependencies.flowController.saveFlow.bind(dependencies.flowController));
  router.post('/flows/:id/deploy', dependencies.flowController.deployFlow.bind(dependencies.flowController));
  router.post('/flows/:id/test', dependencies.flowController.testFlow.bind(dependencies.flowController));

  // LLM routes
  router.get('/llms', dependencies.llmController.listLlms.bind(dependencies.llmController));
  router.post('/llms', dependencies.llmController.createLlm.bind(dependencies.llmController));
  router.post('/llm/test', dependencies.llmController.testLlm.bind(dependencies.llmController));
  router.delete('/llms/:id', dependencies.llmController.deleteLlm.bind(dependencies.llmController));

  // AI Chat routes
  router.post('/ai-chat', dependencies.aiChatController.sendMessage.bind(dependencies.aiChatController));

  // Catalog routes (simplified implementation)
  router.get('/catalog/:type', (req, res) => {
    const { type } = req.params;
    if (type !== 'agents' && type !== 'tools') {
      res.status(400).json({
        error: 'Invalid type',
        code: 'VALIDATION_ERROR',
        message: 'Type must be either "agents" or "tools"'
      });
      return;
    }

    const mockItems = type === 'agents' ? [
      {
        id: 'ca1',
        kind: 'agent',
        name: 'Text Summarizer',
        description: 'Summarizes long text content',
        status: 'deployed',
        version: '1.2.0',
        author: 'user@example.com',
        tags: ['nlp', 'summarization'],
        createdAt: '2025-10-15T00:00:00Z'
      }
    ] : [
      {
        id: 'ct1',
        kind: 'tool',
        name: 'Email Sender',
        description: 'Sends emails via SMTP',
        status: 'deployed',
        version: '1.0.0',
        author: 'user@example.com',
        tags: ['email', 'communication'],
        createdAt: '2025-10-15T00:00:00Z'
      }
    ];

    res.json(mockItems);
  });

  // Marketplace routes (simplified implementation)
  router.get('/market/:type', (req, res) => {
    const { type } = req.params;
    if (type !== 'agents' && type !== 'tools') {
      res.status(400).json({
        error: 'Invalid type',
        code: 'VALIDATION_ERROR',
        message: 'Type must be either "agents" or "tools"'
      });
      return;
    }

    const mockItems = type === 'agents' ? [
      {
        id: 'ma1',
        kind: 'agent',
        name: 'Advanced Summarizer',
        description: 'AI agent that summarizes text content with customizable length',
        version: '2.1.0',
        author: 'marketplace@example.com',
        downloads: 1250,
        rating: 4.8,
        tags: ['nlp', 'summarization', 'ai'],
        category: 'nlp',
        license: 'MIT',
        documentation: 'https://docs.example.com/summarizer',
        createdAt: '2025-10-10T00:00:00Z',
        updatedAt: '2025-10-15T00:00:00Z'
      }
    ] : [
      {
        id: 'mt1',
        kind: 'tool',
        name: 'MCP-Email',
        description: 'Email integration tool',
        version: '1.0.0',
        author: 'marketplace@example.com',
        downloads: 850,
        rating: 4.5,
        tags: ['email', 'integration'],
        category: 'communication',
        license: 'MIT',
        createdAt: '2025-10-10T00:00:00Z'
      }
    ];

    res.json(mockItems);
  });

  router.post('/market/:id/add', (req, res) => {
    const { id } = req.params;
    const { kind } = req.body;

    if (!kind || (kind !== 'agent' && kind !== 'tool')) {
      res.status(400).json({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        message: 'Kind must be either "agent" or "tool"'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Item added to catalog successfully',
      catalogItemId: `ca-${id}-${Date.now()}`
    });
  });

  // Resource upload route (simplified implementation)
  router.post('/resources/upload', (req, res) => {
    res.status(501).json({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      message: 'File upload functionality not yet implemented'
    });
  });

  return router;
}