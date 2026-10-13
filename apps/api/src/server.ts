import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { ENV } from './config/env';
import { connectDatabase, disconnectDatabase } from '@edtech/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { corsOptions } from './config/cors';
import { logger } from '@edtech/utils';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Configure 5-minute HTTP timeouts for large file uploads
  server.headersTimeout = 300000;
  server.requestTimeout = 300000;
  server.keepAliveTimeout = 120000;


  // 1. Initialize Real-Time Socket.IO Infrastructure
  const io = new SocketIOServer(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
    });
  });

  // 2. Connect Infrastructure (Database & Redis Cache)
  try {
    await connectDatabase(ENV.MONGO_URI);
  } catch (err) {
    logger.error('[API Server] Continuing without immediate MongoDB connection (reconnection pending)...', err);
  }

  await connectRedis();

  // 3. Start HTTP Engine
  server.listen(ENV.PORT, () => {
    logger.info(`[API Server] DIDM LMS Express Platform Engine running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  });

  // 4. Graceful Shutdown Signal Handlers
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`[API Server] ${signal} signal received. Initiating graceful shutdown...`);

    server.close(async () => {
      logger.info('[API Server] HTTP server closed.');

      io.close(() => {
        logger.info('[Socket.IO] Server closed.');
      });

      await disconnectDatabase();
      await disconnectRedis();

      logger.info('[API Server] Graceful shutdown completed cleanly.');
      process.exit(0);
    });

    // Force exit if shutdown hangs beyond 10 seconds
    setTimeout(() => {
      logger.error('[API Server] Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('[API Server] Fatal Boot Failure:', err);
  process.exit(1);
});
