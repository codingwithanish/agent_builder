import { CatalogItem, MarketplaceItem } from '@/domain/entities/Catalog';

export interface CatalogRepository {
  findByKind(kind: 'agent' | 'tool'): Promise<CatalogItem[]>;
  create(item: Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogItem>;
  delete(id: string): Promise<void>;
}

export interface MarketplaceRepository {
  findByKind(kind: 'agent' | 'tool', filters?: {
    category?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<{ items: MarketplaceItem[]; total: number; }>;
  findById(id: string): Promise<MarketplaceItem | null>;
}