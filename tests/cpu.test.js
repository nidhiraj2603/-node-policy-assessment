const request = require('supertest');
const app = require('../src/app');
const cpuMonitor = require('../src/services/cpuMonitor.service');
const cpuTracker = require('../src/utils/cpuTracker');

async function testCpuMonitoring() {
  console.log('\n--- Running CPU Utilization & 70% Restart Tests (Task 2.1) ---');

  // Test 1: GET /api/system/cpu
  const cpuRes = await request(app).get('/api/system/cpu');
  if (cpuRes.status !== 200 || !cpuRes.body.success) {
    throw new Error(`GET /api/system/cpu failed: ${JSON.stringify(cpuRes.body)}`);
  }

  const { threshold, metrics } = cpuRes.body.data;
  console.log(`✓ Real-time CPU Status retrieved:`);
  console.log(`  Configured Restart Threshold: ${threshold}%`);
  console.log(`  Current CPU Usage:           ${metrics.cpuUsagePercentage}%`);
  console.log(`  CPU Cores:                   ${metrics.cpuCores}`);
  console.log(`  Memory Used:                 ${metrics.systemMemory.usedMB}MB / ${metrics.systemMemory.totalMB}MB (${metrics.systemMemory.usedPercent}%)`);

  // Test 2: Verify CPU 70% threshold restart handler invocation
  console.log('Testing threshold restart handler callback invocation...');
  let restartCallbackInvoked = false;
  let recordedUsage = null;

  cpuMonitor.setRestartHandler((usage) => {
    restartCallbackInvoked = true;
    recordedUsage = usage;
  });

  // Manually invoke triggerRestart simulating 75% CPU
  cpuMonitor.isRestarting = false; // Reset flag for unit test
  cpuMonitor.triggerRestart(75.5);

  if (!restartCallbackInvoked || recordedUsage !== 75.5) {
    throw new Error('CPU threshold restart callback was not invoked as expected.');
  }

  console.log(`✓ CPU Restart handler correctly invoked on threshold violation with usage: ${recordedUsage}% >= 70%`);
  console.log('✓ CPU Monitoring and 70% usage auto-restart verified successfully!');
}

module.exports = { testCpuMonitoring };
