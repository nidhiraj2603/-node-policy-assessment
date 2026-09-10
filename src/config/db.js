const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

let memoryServer = null;

/**
 * Connect to MongoDB.
 * Attempts connection to the configured MONGODB_URI.
 * If connection fails and MongoMemoryServer is available, seamlessly falls back
 * so local development and testing can proceed without a separate MongoDB install.
 */
async function connectDB(overrideUri = null) {
  const uri = overrideUri || config.mongodbUri;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    logger.info(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.warn(`Could not connect to MongoDB at ${uri}: ${err.message}`);

    // Attempt fallback to mongodb-memory-server if in dev/test environment
    if (config.nodeEnv !== 'production' && !overrideUri) {
      try {
        logger.info('Attempting to initialize in-memory MongoDB fallback...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri);
        logger.info(`Connected to In-Memory MongoDB at ${memUri}`);
        return conn;
      } catch (memErr) {
        logger.error('Failed to start in-memory MongoDB fallback:', memErr.message);
        throw err;
      }
    } else {
      throw err;
    }
  }
}

/**
 * Disconnect and cleanup MongoDB connection
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    logger.info('MongoDB disconnected cleanly');
  } catch (err) {
    logger.error('Error during MongoDB disconnect:', err.message);
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
