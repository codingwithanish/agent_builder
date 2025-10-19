import { FlowRepository } from '@/domain/interfaces/FlowRepository';
import { DeploymentClient } from '@/domain/interfaces/DeploymentClient';
import { Flow } from '@/domain/entities/Flow';
import { WebSocketDispatcher } from '@/infrastructure/events/websocketDispatcher';
import { logger } from '@/infrastructure/logger';

export class DeploymentService {
  constructor(
    private flowRepository: FlowRepository,
    private deploymentClient: DeploymentClient,
    private wsDispatcher: WebSocketDispatcher
  ) {}

  async deployFlow(flowId: string): Promise<{ deploymentId: string }> {
    const flow = await this.flowRepository.findById(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    if (flow.status === 'deploying') {
      throw new Error('Flow is already being deployed');
    }

    const deploymentId = `deploy-${Date.now()}`;
    
    await this.flowRepository.updateStatus(flowId, 'deploying');
    this.wsDispatcher.broadcast({
      type: 'deployment:started',
      flowId,
      deploymentId,
      timestamp: new Date().toISOString()
    });

    this.startDeploymentProcess(flow, deploymentId).catch(error => {
      logger.error('Deployment process failed', { flowId, deploymentId, error });
    });

    logger.info('Flow deployment initiated', { flowId, deploymentId });
    return { deploymentId };
  }

  private async startDeploymentProcess(flow: Flow, deploymentId: string): Promise<void> {
    const deploymentStart = Date.now();
    
    try {
      const executionNodes = flow.nodes.filter(n => n.kind !== 'input' && n.kind !== 'output');
      
      for (const node of executionNodes) {
        this.wsDispatcher.notifyNodeStatus(
          flow.id, 
          node.id, 
          'deploying', 
          `Deploying ${node.kind} node`
        );

        await this.simulateNodeDeployment(node.id);

        await this.wait(1000 + Math.random() * 2000);

        const shouldFail = Math.random() < 0.1;
        if (shouldFail) {
          const error = {
            code: 'DEPLOYMENT_ERROR',
            message: `Failed to deploy ${node.kind} node`,
            details: 'Simulated deployment failure'
          };

          this.wsDispatcher.notifyNodeError(flow.id, node.id, error);
          await this.flowRepository.updateStatus(flow.id, 'failed');
          
          logger.error('Node deployment failed', { 
            flowId: flow.id, 
            nodeId: node.id, 
            deploymentId 
          });
          return;
        }

        this.wsDispatcher.notifyNodeStatus(flow.id, node.id, 'deployed');
      }

      await this.deploymentClient.deployFlow(flow);
      await this.flowRepository.updateStatus(flow.id, 'deployed');

      const deploymentTime = (Date.now() - deploymentStart) / 1000;
      this.wsDispatcher.notifyDeploymentComplete(flow.id, 'deployed', deploymentTime);

      logger.info('Flow deployment completed successfully', { 
        flowId: flow.id, 
        deploymentId, 
        deploymentTime 
      });

    } catch (error) {
      await this.flowRepository.updateStatus(flow.id, 'failed');
      
      this.wsDispatcher.broadcast({
        type: 'deployment:failed',
        flowId: flow.id,
        deploymentId,
        error: {
          code: 'DEPLOYMENT_FAILED',
          message: 'Flow deployment failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      });

      logger.error('Flow deployment failed', { 
        flowId: flow.id, 
        deploymentId, 
        error 
      });
    }
  }

  private async simulateNodeDeployment(nodeId: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 500 + Math.random() * 1500);
    });
  }

  async getDeploymentStatus(deploymentId: string): Promise<string> {
    try {
      return await this.deploymentClient.getDeploymentStatus(deploymentId);
    } catch (error) {
      logger.error('Failed to get deployment status', { deploymentId, error });
      return 'unknown';
    }
  }

  async stopDeployment(deploymentId: string): Promise<void> {
    try {
      await this.deploymentClient.stopDeployment(deploymentId);
      logger.info('Deployment stopped', { deploymentId });
    } catch (error) {
      logger.error('Failed to stop deployment', { deploymentId, error });
      throw error;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}