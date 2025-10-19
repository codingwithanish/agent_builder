import { Flow, CreateFlowInput, UpdateFlowInput } from '@/domain/entities/Flow';

export interface FlowRepository {
  create(flow: CreateFlowInput): Promise<Flow>;
  findById(id: string): Promise<Flow | null>;
  findAll(): Promise<Flow[]>;
  update(id: string, data: UpdateFlowInput): Promise<void>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: Flow['status']): Promise<void>;
}