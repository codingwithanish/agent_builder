import type { ApiClient } from './ApiClient';
import type { FlowGraph, LlmConfig, ResourceUpload, ToolOrAgentCard, RFNode, RFEdge, TestRun, TestStep, ChatMessage, GeneratedFlow } from '@/lib/types';

export class DummyApiClient implements ApiClient {
  private flows: FlowGraph[] = [];
  private llms: LlmConfig[] = [
    {
      id: 'l1',
      name: 'Claude-Primary',
      model: 'bedrock:claude-v3',
      apiKeyMasked: '***key***',
      createdAt: '2025-10-15T00:00:00Z'
    }
  ];
  private resources: ResourceUpload[] = [];
  private catalogAgents: ToolOrAgentCard[] = [
    { id: 'ca1', kind: 'agent', name: 'Text Summarizer', description: 'Summarizes long text content', status: 'deployed' },
    { id: 'ca2', kind: 'agent', name: 'Data Analyzer', description: 'Analyzes data patterns and trends', status: 'deployed' },
    { id: 'ca3', kind: 'agent', name: 'Content Moderator', description: 'Reviews and moderates user-generated content', status: 'deployed' },
    { id: 'ca4', kind: 'agent', name: 'Language Translator', description: 'Translates text between multiple languages', status: 'deployed' },
    { id: 'ca5', kind: 'agent', name: 'Code Reviewer', description: 'Analyzes and reviews code for best practices', status: 'deployed' },
    { id: 'ca6', kind: 'agent', name: 'Meeting Assistant', description: 'Takes notes and summarizes meetings', status: 'draft' }
  ];
  private catalogTools: ToolOrAgentCard[] = [
    { id: 'ct1', kind: 'tool', name: 'Email Sender', description: 'Sends emails via SMTP', status: 'deployed' },
    { id: 'ct2', kind: 'tool', name: 'File Parser', description: 'Parses various file formats', status: 'deployed' },
    { id: 'ct3', kind: 'tool', name: 'Database Connector', description: 'Connects to SQL and NoSQL databases', status: 'deployed' },
    { id: 'ct4', kind: 'tool', name: 'API Gateway', description: 'Routes and manages API requests', status: 'deployed' },
    { id: 'ct5', kind: 'tool', name: 'Image Processor', description: 'Resizes and optimizes images', status: 'deployed' },
    { id: 'ct6', kind: 'tool', name: 'Webhook Handler', description: 'Receives and processes webhooks', status: 'deployed' },
    { id: 'ct9', kind: 'tool', name: 'Git Tool', description: 'Git operations for version control and repository management', status: 'deployed' },
    { id: 'ct7', kind: 'tool', name: 'PDF Generator', description: 'Creates PDF documents from templates', status: 'draft' },
    { id: 'ct8', kind: 'tool', name: 'Calendar Sync', description: 'Syncs events with calendar services', status: 'deploying' }
  ];

  private marketAgents: ToolOrAgentCard[] = [
    { id: 'ma1', kind: 'agent', name: 'Summarizer', description: 'AI agent that summarizes text content' },
    { id: 'ma2', kind: 'agent', name: 'Classifier', description: 'AI agent that classifies content into categories' },
    { id: 'ma3', kind: 'agent', name: 'Sentiment Analyzer', description: 'Analyzes emotional tone and sentiment' },
    { id: 'ma4', kind: 'agent', name: 'Document Parser', description: 'Extracts structured data from documents' },
    { id: 'ma5', kind: 'agent', name: 'Chat Bot', description: 'Conversational AI for customer support' },
    { id: 'ma6', kind: 'agent', name: 'Content Generator', description: 'Creates marketing content and copy' }
  ];

  private marketTools: ToolOrAgentCard[] = [
    { id: 'mt1', kind: 'tool', name: 'MCP-Email', description: 'Email integration tool' },
    { id: 'mt2', kind: 'tool', name: 'MCP-CRM', description: 'CRM integration tool' },
    { id: 'mt3', kind: 'tool', name: 'MCP-Database', description: 'Database connectivity tool for querying and updating data' },
    { id: 'mt4', kind: 'tool', name: 'MCP-Slack', description: 'Slack integration tool for team communication' },
    { id: 'mt5', kind: 'tool', name: 'MCP-GitHub', description: 'GitHub integration for repository management' },
    { id: 'mt6', kind: 'tool', name: 'MCP-AWS', description: 'AWS services integration toolkit' },
    { id: 'mt7', kind: 'tool', name: 'MCP-Notion', description: 'Notion API integration for workspace management' },
    { id: 'mt8', kind: 'tool', name: 'MCP-Stripe', description: 'Payment processing with Stripe' }
  ];

  constructor() {
    // Load from localStorage if available
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedFlows = localStorage.getItem('agent-builder-flows');
      if (storedFlows) {
        this.flows = JSON.parse(storedFlows);
      }

      const storedLlms = localStorage.getItem('agent-builder-llms');
      if (storedLlms) {
        this.llms = JSON.parse(storedLlms);
      }

      const storedResources = localStorage.getItem('agent-builder-resources');
      if (storedResources) {
        this.resources = JSON.parse(storedResources);
      }

      // For catalog items, merge stored data with defaults to ensure new items appear
      const storedCatalogAgents = localStorage.getItem('agent-builder-catalog-agents');
      if (storedCatalogAgents) {
        const stored = JSON.parse(storedCatalogAgents);
        // Merge: keep stored items and add any new default items not in storage
        const storedIds = new Set(stored.map((a: ToolOrAgentCard) => a.id));
        const newDefaultItems = this.catalogAgents.filter(a => !storedIds.has(a.id));
        this.catalogAgents = [...stored, ...newDefaultItems];
      }

      const storedCatalogTools = localStorage.getItem('agent-builder-catalog-tools');
      if (storedCatalogTools) {
        const stored = JSON.parse(storedCatalogTools);
        // Merge: keep stored items and add any new default items not in storage
        const storedIds = new Set(stored.map((t: ToolOrAgentCard) => t.id));
        const newDefaultItems = this.catalogTools.filter(t => !storedIds.has(t.id));
        this.catalogTools = [...stored, ...newDefaultItems];
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('agent-builder-flows', JSON.stringify(this.flows));
      localStorage.setItem('agent-builder-llms', JSON.stringify(this.llms));
      localStorage.setItem('agent-builder-resources', JSON.stringify(this.resources));
      localStorage.setItem('agent-builder-catalog-agents', JSON.stringify(this.catalogAgents));
      localStorage.setItem('agent-builder-catalog-tools', JSON.stringify(this.catalogTools));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private randomDelay(): Promise<void> {
    return this.wait(Math.random() * 800 + 200);
  }

  async listFlows(): Promise<FlowGraph[]> {
    await this.randomDelay();
    return [...this.flows];
  }

  async getFlow(id: string): Promise<FlowGraph> {
    await this.randomDelay();
    const flow = this.flows.find(f => f.id === id);
    if (!flow) {
      throw new Error(`Flow ${id} not found`);
    }
    return { ...flow };
  }

  async createFlow(input: {name: string; description?: string; llmName: string;}): Promise<FlowGraph> {
    await this.randomDelay();
    
    const inputNode: RFNode = {
      id: 'input-1',
      kind: 'input',
      position: { x: 100, y: 200 },
      data: { name: 'Input' },
      status: 'draft'
    };

    const outputNode: RFNode = {
      id: 'output-1', 
      kind: 'output',
      position: { x: 600, y: 200 },
      data: { name: 'Output' },
      status: 'draft'
    };

    const flow: FlowGraph = {
      id: `flow-${Date.now()}`,
      name: input.name,
      description: input.description,
      llmName: input.llmName,
      nodes: [inputNode, outputNode],
      edges: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.flows.push(flow);
    this.saveToStorage();
    return { ...flow };
  }

  async saveFlow(graph: FlowGraph): Promise<void> {
    await this.randomDelay();
    const index = this.flows.findIndex(f => f.id === graph.id);
    if (index >= 0) {
      this.flows[index] = { ...graph, updatedAt: new Date().toISOString() };
    } else {
      this.flows.push({ ...graph, updatedAt: new Date().toISOString() });
    }
    this.saveToStorage();
  }

  async publishFlow(id: string): Promise<void> {
    await this.randomDelay();
    // Simulation of deployment process will be handled by the store
  }

  async testFlow(id: string, payload: string): Promise<TestRun> {
    const flow = this.flows.find(f => f.id === id);
    if (!flow) {
      throw new Error('Flow not found');
    }

    const testRunId = `test-${Date.now()}`;
    const startTime = new Date().toISOString();
    
    // Filter out input/output nodes for execution simulation
    const executionNodes = flow.nodes.filter(n => n.kind !== 'input' && n.kind !== 'output');
    const steps: TestStep[] = [];
    
    let currentInput = payload;
    let hasError = false;
    
    // Simulate execution of each node
    for (let i = 0; i < executionNodes.length; i++) {
      const node = executionNodes[i];
      const stepStartTime = new Date().toISOString();
      const stepStart = Date.now();
      
      // Simulate processing time
      await this.wait(300 + Math.random() * 800);
      
      // Randomly simulate failures (5% chance)
      const shouldFail = Math.random() < 0.05;
      
      const step: TestStep = {
        nodeId: node.id,
        nodeName: node.data.name || `${node.kind} node`,
        status: shouldFail ? 'failed' : 'completed',
        input: currentInput,
        startTime: stepStartTime,
        duration: Date.now() - stepStart
      };
      
      if (shouldFail) {
        hasError = true;
        step.error = `Error in ${node.kind} node: Simulated failure during execution`;
        step.endTime = new Date().toISOString();
        steps.push(step);
        break;
      } else {
        // Generate mock output based on node type
        let output = '';
        switch (node.kind) {
          case 'agent':
            output = `Agent processed: "${currentInput}" -> Enhanced response with AI insights`;
            break;
          case 'tool':
            output = `Tool executed on: "${currentInput}" -> Tool operation completed successfully`;
            break;
          case 'condition':
            output = Math.random() > 0.5 ? 'true' : 'false';
            break;
          case 'human':
            output = `Human interaction required for: "${currentInput}" -> User provided feedback`;
            break;
          default:
            output = `Processed: "${currentInput}"`;
        }
        
        step.output = output;
        step.endTime = new Date().toISOString();
        currentInput = output;
      }
      
      steps.push(step);
    }
    
    const endTime = new Date().toISOString();
    
    const testRun: TestRun = {
      id: testRunId,
      flowId: id,
      status: hasError ? 'failed' : 'completed',
      input: payload,
      output: hasError ? undefined : currentInput,
      error: hasError ? 'Test execution failed' : undefined,
      steps,
      startTime,
      endTime
    };
    
    return testRun;
  }

  async listLlms(): Promise<LlmConfig[]> {
    await this.randomDelay();
    return [...this.llms];
  }

  async createLlm(input: {name: string; model: string; apiKey: string}): Promise<LlmConfig> {
    await this.randomDelay();
    
    const llm: LlmConfig = {
      id: `llm-${Date.now()}`,
      name: input.name,
      model: input.model,
      apiKeyMasked: `***${input.apiKey.slice(-4)}`,
      createdAt: new Date().toISOString()
    };

    this.llms.push(llm);
    this.saveToStorage();
    return { ...llm };
  }

  async testLlm(input: {model: string; apiKey: string}): Promise<{ ok: boolean; message?: string }> {
    await this.wait(1000 + Math.random() * 1000);
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      return { ok: false, message: 'Unable to connect to LLM. Check model and API key.' };
    }
    
    return { ok: true };
  }

  async uploadResource(input: {name: string; file: File}): Promise<ResourceUpload> {
    await this.randomDelay();
    
    // Simple file type detection
    let kind: 'agent' | 'tool' | 'unknown' = 'unknown';
    if (input.file.name.includes('agent') || input.file.type.includes('agent')) {
      kind = 'agent';
    } else if (input.file.name.includes('tool') || input.file.type.includes('tool')) {
      kind = 'tool';
    }

    const resource: ResourceUpload = {
      id: `resource-${Date.now()}`,
      name: input.name,
      filename: input.file.name,
      size: input.file.size,
      kind,
      createdAt: new Date().toISOString()
    };

    this.resources.push(resource);
    
    // Add to catalog if it's an agent or tool
    if (kind === 'agent') {
      this.catalogAgents.push({
        id: resource.id,
        kind: 'agent',
        name: resource.name,
        description: `Uploaded resource: ${resource.filename}`,
        status: 'draft'
      });
    } else if (kind === 'tool') {
      this.catalogTools.push({
        id: resource.id,
        kind: 'tool',
        name: resource.name,
        description: `Uploaded resource: ${resource.filename}`,
        status: 'draft'
      });
    }
    
    this.saveToStorage();
    return { ...resource };
  }

  async listCatalogAgents(): Promise<ToolOrAgentCard[]> {
    await this.randomDelay();
    return [...this.catalogAgents];
  }

  async listCatalogTools(): Promise<ToolOrAgentCard[]> {
    await this.randomDelay();
    return [...this.catalogTools];
  }

  async listMarketAgents(): Promise<ToolOrAgentCard[]> {
    await this.randomDelay();
    return [...this.marketAgents];
  }

  async listMarketTools(): Promise<ToolOrAgentCard[]> {
    await this.randomDelay();
    return [...this.marketTools];
  }

  async addMarketItemToCatalog(id: string, kind: 'agent'|'tool'): Promise<void> {
    await this.randomDelay();

    const marketItems = kind === 'agent' ? this.marketAgents : this.marketTools;
    const catalogItems = kind === 'agent' ? this.catalogAgents : this.catalogTools;

    const item = marketItems.find(i => i.id === id);
    if (item && !catalogItems.find(c => c.id === id)) {
      catalogItems.push({ ...item, status: 'draft' });
      this.saveToStorage();
    }
  }

  async sendChatMessage(message: string, history: ChatMessage[]): Promise<{ response: ChatMessage; generatedFlow?: GeneratedFlow }> {
    await this.wait(1000 + Math.random() * 1500);

    const lowerMessage = message.toLowerCase();
    let responseText = '';
    let generatedFlow: GeneratedFlow | undefined;

    // Pattern matching for different types of requests
    if (lowerMessage.includes('code review') || lowerMessage.includes('code reviewer')) {
      responseText = 'Great! I\'ll create a code review workflow for you. This flow includes a Code Reviewer agent with the Git Tool attached, followed by a Text Summarizer to summarize the review results.';

      const timestamp = Date.now();
      generatedFlow = {
        nodes: [
          {
            id: `agent-${timestamp}-1`,
            kind: 'agent',
            position: { x: 300, y: 200 },
            data: {
              agentId: 'ca5',
              name: 'Code Reviewer',
              description: 'Reviews code for best practices',
              env: {},
              attachedToolIds: ['ct9'] // Git Tool
            },
            status: 'draft'
          },
          {
            id: `agent-${timestamp}-2`,
            kind: 'agent',
            position: { x: 550, y: 200 },
            data: {
              agentId: 'ca1',
              name: 'Text Summarizer',
              description: 'Summarizes the review',
              env: {},
              attachedToolIds: []
            },
            status: 'draft'
          }
        ],
        edges: [
          {
            id: `edge-${timestamp}-1`,
            source: '__INPUT__', // Marker for existing input node
            target: `agent-${timestamp}-1`
          },
          {
            id: `edge-${timestamp}-2`,
            source: `agent-${timestamp}-1`,
            target: `agent-${timestamp}-2`
          },
          {
            id: `edge-${timestamp}-3`,
            source: `agent-${timestamp}-2`,
            target: '__OUTPUT__' // Marker for existing output node
          }
        ],
        description: 'Code Review Workflow'
      };
    } else if (lowerMessage.includes('data') && (lowerMessage.includes('analyze') || lowerMessage.includes('analysis'))) {
      responseText = 'I\'ll set up a data analysis workflow. This includes a Data Analyzer agent to analyze your data patterns.';

      const timestamp = Date.now();
      generatedFlow = {
        nodes: [
          {
            id: `agent-${timestamp}`,
            kind: 'agent',
            position: { x: 350, y: 200 },
            data: {
              agentId: 'ca2',
              name: 'Data Analyzer',
              description: 'Analyzes data patterns',
              env: {},
              attachedToolIds: []
            },
            status: 'draft'
          }
        ],
        edges: [
          {
            id: `edge-${timestamp}-1`,
            source: '__INPUT__',
            target: `agent-${timestamp}`
          },
          {
            id: `edge-${timestamp}-2`,
            source: `agent-${timestamp}`,
            target: '__OUTPUT__'
          }
        ],
        description: 'Data Analysis Workflow'
      };
    } else if (lowerMessage.includes('translate') || lowerMessage.includes('translation')) {
      responseText = 'I\'ll create a translation workflow using the Language Translator agent. This will take input text and translate it to your desired language.';

      const timestamp = Date.now();
      generatedFlow = {
        nodes: [
          {
            id: `agent-${timestamp}`,
            kind: 'agent',
            position: { x: 350, y: 200 },
            data: {
              agentId: 'ca4',
              name: 'Language Translator',
              description: 'Translates text',
              env: {},
              attachedToolIds: []
            },
            status: 'draft'
          }
        ],
        edges: [
          {
            id: `edge-${timestamp}-1`,
            source: '__INPUT__',
            target: `agent-${timestamp}`
          },
          {
            id: `edge-${timestamp}-2`,
            source: `agent-${timestamp}`,
            target: '__OUTPUT__'
          }
        ],
        description: 'Translation Workflow'
      };
    } else if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
      responseText = 'I\'ll build a text summarization workflow. This uses the Text Summarizer agent to condense long content into key points.';

      const timestamp = Date.now();
      generatedFlow = {
        nodes: [
          {
            id: `agent-${timestamp}`,
            kind: 'agent',
            position: { x: 350, y: 200 },
            data: {
              agentId: 'ca1',
              name: 'Text Summarizer',
              description: 'Summarizes content',
              env: {},
              attachedToolIds: []
            },
            status: 'draft'
          }
        ],
        edges: [
          {
            id: `edge-${timestamp}-1`,
            source: '__INPUT__',
            target: `agent-${timestamp}`
          },
          {
            id: `edge-${timestamp}-2`,
            source: `agent-${timestamp}`,
            target: '__OUTPUT__'
          }
        ],
        description: 'Text Summarization Workflow'
      };
    } else {
      // Default response for unrecognized patterns
      responseText = 'I understand you want to create an agentic workflow. Could you provide more details about what you\'d like to accomplish? For example:\n\n- "Create a code review workflow"\n- "Set up a data analysis pipeline"\n- "Build a translation workflow"\n- "Create a text summarization flow"\n\nYou can also browse the Catalogue tab to see available agents and tools that can be used in your workflow.';
    }

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString()
    };

    return {
      response: assistantMessage,
      generatedFlow
    };
  }
}