import { NodeStatus } from '@/domain/types';

export interface CatalogItem {
  id: string;
  kind: 'agent' | 'tool';
  name: string;
  description: string;
  status: NodeStatus;
  version?: string;
  author?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceItem extends CatalogItem {
  downloads?: number;
  rating?: number;
  category?: string;
  license?: string;
  documentation?: string;
}