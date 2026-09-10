const express = require('express');
// Preload all Mongoose models
require('./models');

const policyRoutes = require('./routes/policy.routes');
const messageRoutes = require('./routes/message.routes');
const systemRoutes = require('./routes/system.routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware');
const logger = require('./utils/logger');

const app = express();

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// Root Information Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Insurance Policy Assessment & System Management API',
    version: '1.0.0',
    description: 'Node.js backend with Worker Threads, CPU Utilization Auto-Restart, and Scheduled DB Insertion Service',
    endpoints: {
      task1: {
        uploadData: 'POST /api/policies/upload (multipart/form-data with "file" field)',
        searchPolicyByUsername: 'GET /api/policies/search?username=<name>',
        aggregatedPolicyByUser: 'GET /api/policies/aggregated'
      },
      task2: {
        realtimeCpuStatus: 'GET /api/system/cpu',
        simulateCpuLoadToTestRestart: 'POST /api/system/simulate-cpu-load',
        scheduleMessagePostService: 'POST /api/messages/schedule (body: message, day, time)',
        viewScheduledMessages: 'GET /api/messages/scheduled',
        viewInsertedMessages: 'GET /api/messages/inserted'
      }
    }
  });
});

// API Routes
app.use('/api/policies', policyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/system', systemRoutes);

// Catch-all 404 & error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
