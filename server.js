const cluster = require('cluster');
const http = require('http');
const { spawn } = require('child_process');
const config = require('./src/config');
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const cpuMonitor = require('./src/services/cpuMonitor.service');
const scheduler = require('./src/services/scheduler.service');
const logger = require('./src/utils/logger');

// Check if cluster mode is enabled (default true for auto-restart resilience)
const USE_CLUSTER = process.env.DISABLE_CLUSTER !== 'true';

if (USE_CLUSTER && cluster.isPrimary) {
  // ==========================================
  // CLUSTER PRIMARY (SUPERVISOR) PROCESS
  // ==========================================
  logger.info(`================================================================`);
  logger.info(`[PRIMARY] Master Process running on PID: ${process.pid}`);
  logger.info(`[PRIMARY] CPU Threshold for restart: ${config.cpuThreshold}%`);
  logger.info(`================================================================`);

  // Fork the initial worker
  let currentWorker = cluster.fork();

  currentWorker.on('message', (msg) => {
    if (msg && msg.type === 'CPU_RESTART_REQUEST') {
      logger.warn(`[PRIMARY] Received CPU restart request from worker ${currentWorker.process.pid} (Usage: ${msg.usage}%).`);
      logger.warn(`[PRIMARY] Recycling worker to restore optimal performance...`);
      currentWorker.kill('SIGTERM');
    }
  });

  // When a worker dies, automatically spawn a replacement
  cluster.on('exit', (deadWorker, code, signal) => {
    logger.warn(`[PRIMARY] Worker ${deadWorker.process.pid} exited (Code: ${code}, Signal: ${signal}).`);
    logger.info(`[PRIMARY] Forking fresh replacement worker...`);
    currentWorker = cluster.fork();

    currentWorker.on('message', (msg) => {
      if (msg && msg.type === 'CPU_RESTART_REQUEST') {
        logger.warn(`[PRIMARY] Received CPU restart request from worker ${currentWorker.process.pid} (Usage: ${msg.usage}%).`);
        currentWorker.kill('SIGTERM');
      }
    });
  });

  // Forward termination signals to workers
  process.on('SIGINT', () => {
    logger.info('[PRIMARY] SIGINT received. Shutting down cluster...');
    if (currentWorker) currentWorker.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('[PRIMARY] SIGTERM received. Shutting down cluster...');
    if (currentWorker) currentWorker.kill('SIGTERM');
    process.exit(0);
  });

} else {
  // ==========================================
  // WORKER PROCESS / STANDALONE SERVER
  // ==========================================
  let server = null;

  async function startServer() {
    try {
      // 1. Connect to Database
      await connectDB();

      // 2. Start Scheduled Message Service (Task 2)
      scheduler.start();

      // 3. Start HTTP Server
      server = http.createServer(app);
      server.listen(config.port, () => {
        logger.info(`[WORKER ${process.pid}] Server running on port ${config.port} (${config.nodeEnv})`);
      });

      // 4. Configure CPU Monitor Restart Handler (Task 2)
      cpuMonitor.setRestartHandler((cpuUsage) => {
        logger.warn(`[WORKER ${process.pid}] Initiating restart due to CPU usage at ${cpuUsage.toFixed(2)}% >= ${config.cpuThreshold}%`);

        if (process.send) {
          // Running in cluster worker: notify primary supervisor
          process.send({ type: 'CPU_RESTART_REQUEST', usage: cpuUsage });
          setTimeout(() => {
            gracefulShutdown('CPU_THRESHOLD_EXCEEDED');
          }, 500);
        } else {
          // Standalone process: spawn new process and terminate current
          logger.info('[STANDALONE] Spawning new process before exiting...');
          const child = spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'inherit'
          });
          child.unref();
          setTimeout(() => {
            gracefulShutdown('CPU_THRESHOLD_EXCEEDED');
          }, 500);
        }
      });

      // 5. Start Real-time CPU Utilization Monitoring (Task 2)
      cpuMonitor.start();

    } catch (err) {
      logger.error(`[WORKER ${process.pid}] Failed to start server:`, err.message);
      process.exit(1);
    }
  }

  async function gracefulShutdown(reason = 'NORMAL') {
    logger.info(`[WORKER ${process.pid}] Performing graceful shutdown (Reason: ${reason})...`);
    cpuMonitor.stop();
    scheduler.stop();

    if (server) {
      server.close(async () => {
        logger.info(`[WORKER ${process.pid}] HTTP server closed.`);
        await disconnectDB();
        process.exit(reason === 'CPU_THRESHOLD_EXCEEDED' ? 0 : 0);
      });

      // Force close if graceful close hangs
      setTimeout(async () => {
        logger.warn(`[WORKER ${process.pid}] Forcing exit after timeout.`);
        await disconnectDB();
        process.exit(1);
      }, 3000);
    } else {
      await disconnectDB();
      process.exit(0);
    }
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  startServer();
}
