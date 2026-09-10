const cpuMonitor = require('../services/cpuMonitor.service');
const cpuTracker = require('../utils/cpuTracker');
const logger = require('../utils/logger');

class SystemController {
  /**
   * Get real-time CPU utilization and server status
   */
  getCpuStatus(req, res) {
    const status = cpuMonitor.getStatus();
    return res.status(200).json({
      success: true,
      message: 'System and CPU utilization status retrieved',
      data: status
    });
  }

  /**
   * Simulate high CPU utilization to test 70% threshold and auto-restart
   */
  simulateCpuLoad(req, res) {
    const durationMs = parseInt(req.query.duration || req.body.duration || '3000', 10);
    logger.warn(`Simulating intense CPU load for ${durationMs}ms to test 70% restart threshold...`);

    // Acknowledge request right before starting load
    res.status(200).json({
      success: true,
      message: `Simulating CPU load for ${durationMs}ms. CPU monitor should detect usage >= 70% and trigger server restart.`,
      threshold: cpuMonitor.threshold
    });

    // Run synchronous computational load to saturate CPU
    const end = Date.now() + durationMs;
    setTimeout(() => {
      while (Date.now() < end) {
        Math.sqrt(Math.random() * Math.random());
      }
      // Trigger check immediately after stress
      cpuMonitor.checkCpuUsage();
    }, 50);
  }

  /**
   * Manually trigger server restart for testing
   */
  triggerManualRestart(req, res) {
    logger.warn('Manual server restart triggered via API endpoint');
    res.status(200).json({
      success: true,
      message: 'Server restart triggered manually.'
    });

    setTimeout(() => {
      cpuMonitor.triggerRestart(100);
    }, 100);
  }
}

module.exports = new SystemController();
