require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/policy_assessment_db',
  cpuThreshold: parseFloat(process.env.CPU_THRESHOLD || '70'),
  cpuCheckIntervalMs: parseInt(process.env.CPU_CHECK_INTERVAL_MS || '1500', 10),
  schedulerTickIntervalMs: parseInt(process.env.SCHEDULER_TICK_INTERVAL_MS || '5000', 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
};
