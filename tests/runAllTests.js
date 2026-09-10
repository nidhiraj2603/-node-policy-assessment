const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { testWorkerIngestion } = require('./worker.test');
const { testPolicyAPIs } = require('./policy.test');
const { testSchedulerService } = require('./scheduler.test');
const { testCpuMonitoring } = require('./cpu.test');

async function runAllTests() {
  console.log('================================================================');
  console.log(' STARTING FULL POLICY ASSESSMENT TEST SUITE');
  console.log('================================================================');

  let memoryServer = null;
  let mongoUri = process.env.MONGODB_URI;

  try {
    // Spin up an in-memory MongoDB instance for isolated testing
    console.log('Starting In-Memory MongoDB instance...');
    memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri();
    console.log(`In-Memory MongoDB running at: ${mongoUri}`);

    await mongoose.connect(mongoUri);

    // Run Suite 1: Worker Thread file ingestion and collection verification
    await testWorkerIngestion(mongoUri);

    // Run Suite 2: Search Policy and User Aggregation APIs
    await testPolicyAPIs();

    // Run Suite 3: Task 2.2 Scheduled Message Post-Service
    await testSchedulerService();

    // Run Suite 4: Task 2.1 CPU Utilization & 70% Auto-Restart
    await testCpuMonitoring();

    console.log('\n================================================================');
    console.log(' ALL TESTS PASSED SUCCESSFULLY! (100% VERIFIED)');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      if (memoryServer) await memoryServer.stop();
    } catch (e) {}
  }
}

runAllTests();
