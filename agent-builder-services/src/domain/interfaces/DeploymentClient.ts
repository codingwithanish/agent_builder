import { Flow } from '@/domain/entities/Flow';

export interface DeploymentClient {
  deployFlow(flow: Flow): Promise<void>;
  getDeploymentStatus(id: string): Promise<string>;
  stopDeployment(id: string): Promise<void>;
}