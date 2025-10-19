import { FlowRepository } from '@/domain/interfaces/FlowRepository';
import { LlmRepository } from '@/domain/interfaces/LlmRepository';
import { Flow, CreateFlowInput, UpdateFlowInput } from '@/domain/entities/Flow';
import { TestRun, TestStep } from '@/domain/types';
import { logger } from '@/infrastructure/logger';

export class FlowService {
  constructor(
    private flowRepository: FlowRepository,
    private llmRepository: LlmRepository
  ) {}

  async createFlow(input: CreateFlowInput): Promise<Flow> {
    await this.validateLlmExists(input.llmName);
    
    const flow = await this.flowRepository.create(input);
    logger.info('Flow created', { flowId: flow.id, name: flow.name });
    return flow;
  }

  async getFlow(id: string): Promise<Flow> {
    const flow = await this.flowRepository.findById(id);
    if (!flow) {
      throw new Error(`Flow ${id} not found`);
    }
    return flow;
  }

  async listFlows(): Promise<Flow[]> {
    return this.flowRepository.findAll();
  }

  async updateFlow(id: string, data: UpdateFlowInput): Promise<void> {
    const existingFlow = await this.getFlow(id);
    
    if (data.llmName && data.llmName !== existingFlow.llmName) {
      await this.validateLlmExists(data.llmName);
    }

    await this.flowRepository.update(id, data);
    logger.info('Flow updated', { flowId: id });
  }

  async saveFlow(graph: Flow): Promise<void> {
    const existingFlow = await this.getFlow(graph.id);
    
    if (graph.llmName !== existingFlow.llmName) {
      await this.validateLlmExists(graph.llmName);
    }

    await this.flowRepository.update(graph.id, {
      name: graph.name,
      description: graph.description,
      llmName: graph.llmName,
      nodes: graph.nodes,
      edges: graph.edges
    });

    logger.info('Flow saved', { flowId: graph.id });
  }

  async deleteFlow(id: string): Promise<void> {
    await this.getFlow(id); // Ensure exists
    await this.flowRepository.delete(id);
    logger.info('Flow deleted', { flowId: id });
  }

  async testFlow(id: string, payload: string): Promise<TestRun> {
    const flow = await this.getFlow(id);
    
    const testRunId = `test-${Date.now()}`;
    const startTime = new Date().toISOString();
    
    const executionNodes = flow.nodes.filter(n => n.kind !== 'input' && n.kind !== 'output');
    const steps: TestStep[] = [];
    
    let currentInput = payload;
    let hasError = false;
    
    for (let i = 0; i < executionNodes.length; i++) {
      const node = executionNodes[i];
      const stepStartTime = new Date().toISOString();
      const stepStart = Date.now();
      
      await this.wait(300 + Math.random() * 800);
      
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
    
    logger.info('Flow test completed', { 
      flowId: id, 
      testRunId, 
      status: testRun.status,
      stepCount: steps.length 
    });
    
    return testRun;
  }

  private async validateLlmExists(llmName: string): Promise<void> {
    const llm = await this.llmRepository.findByName(llmName);
    if (!llm) {
      throw new Error(`LLM configuration '${llmName}' not found`);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}