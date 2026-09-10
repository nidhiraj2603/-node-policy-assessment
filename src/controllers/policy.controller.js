const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const policyService = require('../services/policy.service');
const config = require('../config');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class PolicyController {
  /**
   * Task 1.1: Upload XLSX/CSV data into MongoDB using Worker Threads
   */
  async uploadFile(req, res, next) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload a CSV or XLSX file using field name 'file'."
      });
    }

    const filePath = req.file.path;
    const workerPath = path.resolve(__dirname, '../workers/fileUploadWorker.js');

    logger.info(`Spawning Worker Thread to process file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Use current mongoose connection string if connected to in-memory fallback
    const activeMongoUri = mongoose.connection.readyState === 1
      ? mongoose.connection._connectionString || config.mongodbUri
      : config.mongodbUri;

    const worker = new Worker(workerPath, {
      workerData: {
        filePath: filePath,
        mongodbUri: activeMongoUri
      }
    });

    worker.on('message', (result) => {
      // Clean up uploaded temp file
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) logger.warn(`Could not delete temp file ${filePath}: ${err.message}`);
        });
      }

      if (!result.success) {
        logger.error('Worker thread reported failure:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Error processing file in worker thread',
          error: result.error
        });
      }

      logger.info(`Worker finished successfully in ${result.durationMs}ms. Processed: ${result.totalRows} rows.`);
      return res.status(200).json({
        success: true,
        message: 'File processed and data uploaded into MongoDB successfully via Worker Thread',
        data: result
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker thread unexpected error:', err.message);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
      return res.status(500).json({
        success: false,
        message: 'Worker thread execution failed',
        error: err.message
      });
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`Worker thread exited with code: ${code}`);
      }
    });
  }

  /**
   * Task 1.2: Search API to find policy info with the help of username
   */
  async searchByUsername(req, res, next) {
    try {
      const username = req.query.username || req.params.username;
      if (!username) {
        return res.status(400).json({
          success: false,
          message: "Query parameter 'username' is required. Example: /api/policies/search?username=Lura"
        });
      }

      const results = await policyService.searchByUsername(username);
      return res.status(200).json({
        success: true,
        message: `Found ${results.policiesCount} policies matching username '${username}'`,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Task 1.3: API to provide aggregated policy by each user
   */
  async getAggregatedPoliciesByUser(req, res, next) {
    try {
      const aggregation = await policyService.getAggregatedPoliciesByUser();
      return res.status(200).json({
        success: true,
        message: 'Policies aggregated by user retrieved successfully',
        data: aggregation
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PolicyController();
