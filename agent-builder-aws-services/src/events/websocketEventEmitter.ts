import WebSocket from 'ws';
import { EventEmitterPort } from '@/domain/interfaces';
import { WebSocketEvent } from '@/domain/types';
import { logger } from '@/observability/logger';

export class WebSocketEventEmitter implements EventEmitterPort {
  private wss: WebSocket.Server | null = null;
  private clients = new Map<string, WebSocket>();
  private deploymentClients = new Map<string, Set<string>>(); // deploymentId -> Set of clientIds

  initialize(server: any) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });
    
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const deploymentId = url.searchParams.get('deploymentId');
      
      logger.info('WebSocket client connected', { 
        clientId, 
        deploymentId,
        clientCount: this.clients.size 
      });

      // Subscribe to deployment updates if deploymentId provided
      if (deploymentId) {
        this.subscribeToDeployment(clientId, deploymentId);
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          logger.warn('Invalid WebSocket message received', { clientId, error });
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket client error', { clientId, error });
        this.handleClientDisconnect(clientId);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection:established',
        id: clientId,
        data: { clientId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });
    });

    logger.info('WebSocket server initialized');
  }

  emit(event: WebSocketEvent): void {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized, cannot emit event');
      return;
    }

    this.broadcast(event);
  }

  emitToClient(clientId: string, event: WebSocketEvent): void {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn('Client not found for direct message', { clientId });
      return;
    }

    this.sendToClient(client, event);
  }

  broadcast(event: WebSocketEvent): void {
    if (!this.wss || this.clients.size === 0) {
      return;
    }

    const eventStr = JSON.stringify(event);
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(eventStr);
          sentCount++;
        } catch (error) {
          logger.error('Failed to send WebSocket message', { clientId, error });
          this.handleClientDisconnect(clientId);
        }
      }
    });

    logger.debug('Broadcasted WebSocket event', { 
      type: event.type, 
      clientCount: this.clients.size,
      sentCount 
    });
  }

  // Deployment-specific methods
  emitDeploymentProgress(deploymentId: string, step: string, progress: number, message?: string): void {
    const event: WebSocketEvent = {
      type: 'deploy:progress',
      id: deploymentId,
      data: {
        deploymentId,
        step,
        progress,
        message,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.emitToDeploymentSubscribers(deploymentId, event);
  }

  emitDeploymentComplete(deploymentId: string, status: string, resourceId?: string): void {
    const event: WebSocketEvent = {
      type: 'deploy:complete',
      id: deploymentId,
      data: {
        deploymentId,
        status,
        resourceId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.emitToDeploymentSubscribers(deploymentId, event);
    
    // Clean up deployment subscriptions
    this.deploymentClients.delete(deploymentId);
  }

  emitDeploymentError(deploymentId: string, error: string, details?: any): void {
    const event: WebSocketEvent = {
      type: 'deploy:error',
      id: deploymentId,
      data: {
        deploymentId,
        error,
        details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.emitToDeploymentSubscribers(deploymentId, event);
  }

  emitInvocationResult(invocationId: string, output: any, metadata?: any): void {
    const event: WebSocketEvent = {
      type: 'invoke:result',
      id: invocationId,
      data: {
        invocationId,
        output,
        metadata,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  close(): void {
    if (this.wss) {
      this.clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1000, 'Server shutting down');
        }
      });
      
      this.wss.close();
      this.clients.clear();
      this.deploymentClients.clear();
      
      logger.info('WebSocket server closed');
    }
  }

  private subscribeToDeployment(clientId: string, deploymentId: string): void {
    if (!this.deploymentClients.has(deploymentId)) {
      this.deploymentClients.set(deploymentId, new Set());
    }
    
    this.deploymentClients.get(deploymentId)!.add(clientId);
    
    logger.debug('Client subscribed to deployment', { clientId, deploymentId });
  }

  private unsubscribeFromDeployments(clientId: string): void {
    this.deploymentClients.forEach((clients, deploymentId) => {
      if (clients.has(clientId)) {
        clients.delete(clientId);
        if (clients.size === 0) {
          this.deploymentClients.delete(deploymentId);
        }
      }
    });
  }

  private emitToDeploymentSubscribers(deploymentId: string, event: WebSocketEvent): void {
    const subscribers = this.deploymentClients.get(deploymentId);
    if (!subscribers || subscribers.size === 0) {
      // No specific subscribers, broadcast to all
      this.broadcast(event);
      return;
    }

    const eventStr = JSON.stringify(event);
    let sentCount = 0;

    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          client.send(eventStr);
          sentCount++;
        } catch (error) {
          logger.error('Failed to send deployment event', { clientId, deploymentId, error });
          this.handleClientDisconnect(clientId);
        }
      }
    });

    logger.debug('Sent deployment event to subscribers', { 
      deploymentId, 
      type: event.type,
      subscriberCount: subscribers.size,
      sentCount 
    });
  }

  private handleClientMessage(clientId: string, message: any): void {
    logger.debug('Received WebSocket message', { clientId, type: message.type });

    switch (message.type) {
      case 'subscribe:deployment':
        if (message.deploymentId) {
          this.subscribeToDeployment(clientId, message.deploymentId);
        }
        break;
      case 'ping':
        this.emitToClient(clientId, {
          type: 'pong',
          id: clientId,
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;
      default:
        logger.debug('Unknown WebSocket message type', { clientId, type: message.type });
    }
  }

  private handleClientDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    this.unsubscribeFromDeployments(clientId);
    
    logger.info('WebSocket client disconnected', { 
      clientId, 
      remainingClients: this.clients.size 
    });
  }

  private sendToClient(client: WebSocket, event: WebSocketEvent): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(event));
      } catch (error) {
        logger.error('Failed to send WebSocket message to client', { error });
      }
    }
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getter methods for monitoring
  getClientCount(): number {
    return this.clients.size;
  }

  getDeploymentSubscriptions(): Record<string, number> {
    const subscriptions: Record<string, number> = {};
    this.deploymentClients.forEach((clients, deploymentId) => {
      subscriptions[deploymentId] = clients.size;
    });
    return subscriptions;
  }
}