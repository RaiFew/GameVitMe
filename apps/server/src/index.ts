import http from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import { initSocketGateway } from './socket/gateway.js';

import authMiddleware from './auth/middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import friendRoutes from './routes/friend.routes.js';
import roomRoutes from './routes/room.routes.js';
import codenamesRoutes from './routes/codenames.routes.js';

import { GameRegistry } from '@party/game-engine';
import SpyfallPlugin from '@party/spyfall';
import WerewolfPlugin from '@party/werewolf';
import SalemPlugin from '@party/salem';
import CodenamesPlugin from '@party/codenames';
import RockPaperScissorsPlugin from '@party/rock-paper-scissors';
import NumberGridPlugin from '@party/number-grid';

async function bootstrap() {
  const fastify = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  // Register core plugins
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow any origin dynamically (reflects origin back, satisfying credentials: true)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });
  
  await fastify.register(cookie);

  // Auth Context Middleware
  await fastify.register(authMiddleware);

  // Health check routes
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  fastify.get('/', async () => ({ status: 'ok', service: 'GameVitMe API Server' }));

  // Register Routes
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(friendRoutes);
  await fastify.register(roomRoutes);
  await fastify.register(codenamesRoutes);

  // Initialize Socket.io
  const io = initSocketGateway(fastify);

  // Register Games in Engine
  GameRegistry.getInstance().register(SpyfallPlugin);
  GameRegistry.getInstance().register(WerewolfPlugin);
  GameRegistry.getInstance().register(SalemPlugin);
  GameRegistry.getInstance().register(CodenamesPlugin);
  GameRegistry.getInstance().register(RockPaperScissorsPlugin);
  GameRegistry.getInstance().register(NumberGridPlugin);

  // Global Error Handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error', message: error.message });
  });

  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${env.PORT}`);

    // Railway Target Port resilience:
    // If Railway routes traffic to 3000, 3001, or 8080, bind those ports too
    const backupServers: http.Server[] = [];
    const candidatePorts = [8080, 3000, 3001].filter((p) => p !== env.PORT);

    for (const port of candidatePorts) {
      try {
        const backupServer = http.createServer((req, res) => {
          fastify.server.emit('request', req, res);
        });
        io.attach(backupServer);
        backupServer.on('error', (err: any) => {
          // Port already in use or unavailable - safely ignore
        });
        backupServer.listen(port, '0.0.0.0', () => {
          console.log(`[MultiPort] Also listening on backup port ${port}`);
        });
        backupServers.push(backupServer);
      } catch (e) {
        // ignore
      }
    }
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      for (const s of backupServers) {
        s.close();
      }
      io.close();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
