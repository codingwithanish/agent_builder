import { v4 as uuidv4 } from 'uuid';
import { PostgresClient } from '../postgresClient';
import { FlowRepository } from '@/domain/interfaces/FlowRepository';
import { Flow, CreateFlowInput, UpdateFlowInput } from '@/domain/entities/Flow';
import { RFNode } from '@/domain/types';
import { logger } from '@/infrastructure/logger';

export class PostgresFlowRepository implements FlowRepository {
  constructor(private db: PostgresClient) {}

  async create(input: CreateFlowInput): Promise<Flow> {
    const id = `flow-${Date.now()}`;
    const now = new Date().toISOString();
    
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

    const flow: Flow = {
      id,
      name: input.name,
      description: input.description,
      llmName: input.llmName,
      nodes: [inputNode, outputNode],
      edges: [],
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    try {
      await this.db.query(
        `INSERT INTO flows (id, name, description, llm_name, nodes, edges, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          flow.id,
          flow.name,
          flow.description,
          flow.llmName,
          JSON.stringify(flow.nodes),
          JSON.stringify(flow.edges),
          flow.status,
          flow.createdAt,
          flow.updatedAt
        ]
      );

      logger.info('Flow created', { flowId: flow.id, name: flow.name });
      return flow;
    } catch (error) {
      logger.error('Error creating flow', { input, error });
      throw error;
    }
  }

  async findById(id: string): Promise<Flow | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM flows WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.mapRowToFlow(row);
    } catch (error) {
      logger.error('Error finding flow by id', { id, error });
      throw error;
    }
  }

  async findAll(): Promise<Flow[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM flows ORDER BY created_at DESC'
      );

      return result.rows.map(row => this.mapRowToFlow(row));
    } catch (error) {
      logger.error('Error finding all flows', { error });
      throw error;
    }
  }

  async update(id: string, data: UpdateFlowInput): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.llmName !== undefined) {
      updates.push(`llm_name = $${paramIndex++}`);
      values.push(data.llmName);
    }

    if (data.nodes !== undefined) {
      updates.push(`nodes = $${paramIndex++}`);
      values.push(JSON.stringify(data.nodes));
    }

    if (data.edges !== undefined) {
      updates.push(`edges = $${paramIndex++}`);
      values.push(JSON.stringify(data.edges));
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(id);

    try {
      await this.db.query(
        `UPDATE flows SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      logger.info('Flow updated', { flowId: id });
    } catch (error) {
      logger.error('Error updating flow', { id, data, error });
      throw error;
    }
  }

  async updateStatus(id: string, status: Flow['status']): Promise<void> {
    try {
      await this.db.query(
        'UPDATE flows SET status = $1, updated_at = $2 WHERE id = $3',
        [status, new Date().toISOString(), id]
      );

      logger.info('Flow status updated', { flowId: id, status });
    } catch (error) {
      logger.error('Error updating flow status', { id, status, error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.query('DELETE FROM flows WHERE id = $1', [id]);
      logger.info('Flow deleted', { flowId: id });
    } catch (error) {
      logger.error('Error deleting flow', { id, error });
      throw error;
    }
  }

  private mapRowToFlow(row: any): Flow {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      llmName: row.llm_name,
      nodes: JSON.parse(row.nodes),
      edges: JSON.parse(row.edges),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}