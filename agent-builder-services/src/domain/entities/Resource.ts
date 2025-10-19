import { ResourceKind } from '@/domain/types';

export interface Resource {
  id: string;
  name: string;
  filename: string;
  size: number;
  kind: ResourceKind;
  createdAt: string;
  downloadUrl?: string;
}

export interface CreateResourceInput {
  name: string;
  file: {
    originalname: string;
    buffer: Buffer;
    size: number;
    mimetype: string;
  };
}