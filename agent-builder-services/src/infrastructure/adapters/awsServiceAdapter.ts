import { DeploymentClient } from '@/domain/interfaces/DeploymentClient';
import { Flow } from '@/domain/entities/Flow';
import { config } from '@/config/config';
import { logger } from '@/infrastructure/logger';

export class AWSServiceAdapter implements DeploymentClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.AWS_SERVICE_URL;
  }

  async deployFlow(flow: Flow): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flow }),
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.status} ${response.statusText}`);
      }

      logger.info('Flow deployment initiated', { flowId: flow.id, name: flow.name });
    } catch (error) {
      logger.error('Flow deployment error', { flowId: flow.id, error });
      throw error;
    }
  }

  async getDeploymentStatus(id: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as { status?: string };
      return result.status || 'unknown';
    } catch (error) {
      logger.error('Deployment status check error', { deploymentId: id, error });
      throw error;
    }
  }

  async stopDeployment(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/stop/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Stop deployment failed: ${response.status} ${response.statusText}`);
      }

      logger.info('Deployment stopped', { deploymentId: id });
    } catch (error) {
      logger.error('Stop deployment error', { deploymentId: id, error });
      throw error;
    }
  }
}