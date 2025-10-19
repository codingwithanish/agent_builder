import WebSocket from 'ws';
import { logger } from '@/infrastructure/logger';

export interface WebSocketMessage {
  type: string;
  flowId?: string;
  nodeId?: string;
  status?: string;
  message?: string;
  error?: any;
  timestamp: string;
  [key: string]: any;
}

export class WebSocketDispatcher {
  private wss: WebSocket.Server | null = null;
  private connections = new Map<string, Set<WebSocket>>();

  initialize(server: any) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws: WebSocket, request) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const flowId = url.pathname.split('/').pop();
      
      if (!flowId) {
        ws.close(1002, 'Flow ID required');
        return;
      }

      this.addConnection(flowId, ws);
      logger.info('WebSocket connected', { flowId, clientCount: this.getConnectionCount(flowId) });

      ws.on('close', () => {
        this.removeConnection(flowId, ws);
        logger.info('WebSocket disconnected', { flowId, clientCount: this.getConnectionCount(flowId) });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { flowId, error });
        this.removeConnection(flowId, ws);
      });

      ws.send(JSON.stringify({
        type: 'connection:established',
        flowId,
        timestamp: new Date().toISOString()
      }));
    });

    logger.info('WebSocket server initialized');
  }

  private addConnection(flowId: string, ws: WebSocket) {
    if (!this.connections.has(flowId)) {
      this.connections.set(flowId, new Set());
    }
    this.connections.get(flowId)!.add(ws);
  }

  private removeConnection(flowId: string, ws: WebSocket) {
    const flowConnections = this.connections.get(flowId);
    if (flowConnections) {
      flowConnections.delete(ws);
      if (flowConnections.size === 0) {
        this.connections.delete(flowId);
      }
    }
  }

  private getConnectionCount(flowId: string): number {
    return this.connections.get(flowId)?.size || 0;
  }

  broadcast(message: WebSocketMessage) {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized, cannot broadcast message');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };

    if (message.flowId) {
      this.broadcastToFlow(message.flowId, messageWithTimestamp);
    } else {
      this.broadcastToAll(messageWithTimestamp);
    }
  }

  private broadcastToFlow(flowId: string, message: WebSocketMessage) {
    const flowConnections = this.connections.get(flowId);
    if (!flowConnections || flowConnections.size === 0) {
      return;
    }

    const messageStr = JSON.stringify(message);
    flowConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });

    logger.debug('Broadcasted message to flow', { 
      flowId, 
      type: message.type, 
      clientCount: flowConnections.size 
    });
  }

  private broadcastToAll(message: WebSocketMessage) {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });

    logger.debug('Broadcasted message to all clients', { 
      type: message.type, 
      clientCount: this.wss.clients.size 
    });
  }

  notifyNodeStatus(flowId: string, nodeId: string, status: string, message?: string) {
    this.broadcast({
      type: 'node:status',
      flowId,
      nodeId,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  notifyDeploymentComplete(flowId: string, status: string, deploymentTime?: number) {
    this.broadcast({
      type: 'deployment:complete',
      flowId,
      status,
      deploymentTime,
      timestamp: new Date().toISOString()
    });
  }

  notifyNodeError(flowId: string, nodeId: string, error: any) {
    this.broadcast({
      type: 'node:error',
      flowId,
      nodeId,
      status: 'failed',
      error,
      timestamp: new Date().toISOString()
    });
  }

  close() {
    if (this.wss) {
      this.wss.close();
      this.connections.clear();
      logger.info('WebSocket server closed');
    }
  }
}