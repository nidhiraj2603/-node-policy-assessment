const os = require('os');

/**
 * CPU Tracker that computes real-time CPU utilization percentage
 * by comparing CPU tick deltas between samples.
 */
class CpuTracker {
  constructor() {
    this.previousSnapshot = this._getSnapshot();
  }

  _getSnapshot() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length,
      timestamp: Date.now()
    };
  }

  /**
   * Returns the current CPU utilization percentage [0 - 100]
   * since the last sample.
   */
  getCurrentUsagePercentage() {
    const current = this._getSnapshot();
    const idleDiff = current.idle - this.previousSnapshot.idle;
    const totalDiff = current.total - this.previousSnapshot.total;

    this.previousSnapshot = current;

    if (totalDiff <= 0) {
      return 0;
    }

    const usage = ((totalDiff - idleDiff) / totalDiff) * 100;
    return Math.max(0, Math.min(100, Math.round(usage * 100) / 100));
  }

  /**
   * Returns a comprehensive snapshot of system and process health
   */
  getSystemMetrics() {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const procMem = process.memoryUsage();

    return {
      cpuUsagePercentage: this.getCurrentUsagePercentage(),
      cpuCores: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      uptimeSeconds: Math.floor(process.uptime()),
      loadAverage: os.loadavg(),
      systemMemory: {
        totalMB: Math.round(memTotal / (1024 * 1024)),
        usedMB: Math.round(memUsed / (1024 * 1024)),
        freeMB: Math.round(memFree / (1024 * 1024)),
        usedPercent: Math.round((memUsed / memTotal) * 10000) / 100
      },
      processMemory: {
        rssMB: Math.round(procMem.rss / (1024 * 1024)),
        heapUsedMB: Math.round(procMem.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(procMem.heapTotal / (1024 * 1024))
      }
    };
  }
}

const singletonTracker = new CpuTracker();
module.exports = singletonTracker;
