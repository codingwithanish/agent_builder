import { Server } from './server';
import { logger } from '@/infrastructure/logger';

async function main() {
  try {
    logger.info('Starting Agent Builder Services...');
    
    const server = new Server();
    await server.start();
    
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

main();