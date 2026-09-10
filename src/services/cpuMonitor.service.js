const cpuTracker = require('../utils/cpuTracker');
const logger = require('../utils/logger');
const config = require('../config');

class CpuMonitorService {
  constructor() {
    this.threshold = config.cpuThreshold; // 70%
    this.intervalMs = config.cpuCheckIntervalMs; // 1500ms
    this.timer = null;
    this.isRunning = false;
    this.restartHandler = null;
    this.isRestarting = false;
    this.consecutiveHighCount = 0;
  }

  /**
   * Set custom restart handler callback (e.g. cluster worker restart or process exit)
   */
  setRestartHandler(handler) {
    this.restartHandler = handler;
  }

  /**
   * Start real-time CPU monitoring
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(`CPU Monitor Service started. Alert threshold: ${this.threshold}%, Check interval: ${this.intervalMs}ms`);

    this.timer = setInterval(() => {
      this.checkCpuUsage();
    }, this.intervalMs);
  }

  /**
   * Stop CPU monitoring
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('CPU Monitor Service stopped.');
  }

  /**
   * Perform single CPU check against threshold
   */
  checkCpuUsage() {
    if (this.isRestarting) return;

    const currentUsage = cpuTracker.getCurrentUsagePercentage();

    if (currentUsage >= this.threshold) {
      this.consecutiveHighCount++;
      logger.warn(`[CPU ALERT] High CPU Usage detected: ${currentUsage.toFixed(2)}% (Threshold: ${this.threshold}%)`);

      // Trigger restart on threshold violation
      this.triggerRestart(currentUsage);
    } else {
      this.consecutiveHighCount = 0;
    }
  }

  /**
   * Trigger server restart
   */
  triggerRestart(currentUsage) {
    if (this.isRestarting) return;
    this.isRestarting = true;

    logger.error(`================================================================`);
    logger.error(`[CPU RESTART TRIGGERED] Current CPU usage: ${currentUsage.toFixed(2)}% exceeded ${this.threshold}%!`);
    logger.error(`Initiating graceful server restart at ${new Date().toISOString()}...`);
    logger.error(`================================================================`);

    if (typeof this.restartHandler === 'function') {
      try {
        this.restartHandler(currentUsage);
      } catch (err) {
        logger.error('Error executing restart handler:', err.message);
        process.exit(1);
      }
    } else {
      // Fallback: exit process to allow process manager / supervisor to restart
      logger.warn('No custom restart handler registered. Exiting process with code 1 for supervisor restart.');
      setTimeout(() => {
        process.exit(1);
      }, 500);
    }
  }

  /**
   * Get latest stats
   */
  getStatus() {
    return {
      monitoringActive: this.isRunning,
      threshold: this.threshold,
      intervalMs: this.intervalMs,
      metrics: cpuTracker.getSystemMetrics()
    };
  }
}

const cpuMonitor = new CpuMonitorService();
module.exports = cpuMonitor;
