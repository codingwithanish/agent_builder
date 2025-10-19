import { Resource, CreateResourceInput } from '@/domain/entities/Resource';

export interface ResourceRepository {
  create(resource: CreateResourceInput): Promise<Resource>;
  findById(id: string): Promise<Resource | null>;
  findAll(): Promise<Resource[]>;
  delete(id: string): Promise<void>;
}