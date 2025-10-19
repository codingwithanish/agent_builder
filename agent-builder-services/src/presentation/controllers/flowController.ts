import { Request, Response } from 'express';
import { FlowService } from '@/application/services/flowService';
import { DeploymentService } from '@/application/services/deploymentService';
import { logger } from '@/infrastructure/logger';

export class FlowController {
  constructor(
    private flowService: FlowService,
    private deploymentService: DeploymentService
  ) {}

  async listFlows(req: Request, res: Response): Promise<void> {
    try {
      const flows = await this.flowService.listFlows();
      res.json(flows);
    } catch (error) {
      logger.error('Error listing flows', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve flows'
      });
    }
  }

  async getFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = await this.flowService.getFlow(id);
      res.json(flow);
    } catch (error) {
      logger.error('Error getting flow', { flowId: req.params.id, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Flow not found',
          code: 'FLOW_NOT_FOUND',
          message: `Flow with ID '${req.params.id}' does not exist`
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve flow'
        });
      }
    }
  }

  async createFlow(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, llmName } = req.body;
      
      if (!name || !llmName) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Name and llmName are required'
        });
        return;
      }

      if (name.length > 25) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Name must be 25 characters or less'
        });
        return;
      }

      if (description && description.length > 500) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Description must be 500 characters or less'
        });
        return;
      }

      const flow = await this.flowService.createFlow({ name, description, llmName });
      res.status(201).json(flow);
    } catch (error) {
      logger.error('Error creating flow', { body: req.body, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(400).json({
          error: 'Invalid LLM',
          code: 'LLM_NOT_FOUND',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to create flow'
        });
      }
    }
  }

  async updateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.name && updateData.name.length > 25) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Name must be 25 characters or less'
        });
        return;
      }

      if (updateData.description && updateData.description.length > 500) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Description must be 500 characters or less'
        });
        return;
      }

      await this.flowService.updateFlow(id, updateData);
      res.json({
        success: true,
        message: 'Flow updated successfully',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating flow', { flowId: req.params.id, body: req.body, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Flow not found',
          code: 'FLOW_NOT_FOUND',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to update flow'
        });
      }
    }
  }

  async saveFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const graph = { ...req.body, id };

      await this.flowService.saveFlow(graph);
      res.json({
        success: true,
        message: 'Flow saved successfully',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error saving flow', { flowId: req.params.id, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Flow not found',
          code: 'FLOW_NOT_FOUND',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to save flow'
        });
      }
    }
  }

  async deployFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.deploymentService.deployFlow(id);
      
      res.json({
        success: true,
        message: 'Flow deployment initiated',
        deploymentId: result.deploymentId
      });
    } catch (error) {
      logger.error('Error deploying flow', { flowId: req.params.id, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Flow not found',
          code: 'FLOW_NOT_FOUND',
          message: error.message
        });
      } else if (error instanceof Error && error.message.includes('already being deployed')) {
        res.status(409).json({
          error: 'Deployment in progress',
          code: 'DEPLOYMENT_IN_PROGRESS',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Deployment failed',
          code: 'DEPLOYMENT_FAILED',
          message: 'Failed to initiate flow deployment'
        });
      }
    }
  }

  async testFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { payload } = req.body;

      if (!payload) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Payload is required for testing'
        });
        return;
      }

      let payloadString: string;
      if (typeof payload === 'string') {
        payloadString = payload;
      } else if (typeof payload === 'object' && payload.input) {
        payloadString = typeof payload.input === 'string' ? payload.input : JSON.stringify(payload.input);
      } else {
        payloadString = JSON.stringify(payload);
      }

      const testResult = await this.flowService.testFlow(id, payloadString);
      res.json({ output: testResult });
    } catch (error) {
      logger.error('Error testing flow', { flowId: req.params.id, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Flow not found',
          code: 'FLOW_NOT_FOUND',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Test failed',
          code: 'TEST_FAILED',
          message: 'Failed to execute flow test'
        });
      }
    }
  }
}