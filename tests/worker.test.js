const { Worker } = require('worker_threads');
const path = require('path');
const mongoose = require('mongoose');
const Agent = require('../src/models/Agent');
const User = require('../src/models/User');
const UserAccount = require('../src/models/UserAccount');
const PolicyCategory = require('../src/models/PolicyCategory');
const PolicyCarrier = require('../src/models/PolicyCarrier');
const Policy = require('../src/models/Policy');

function runWorker(filePath, mongodbUri) {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, '../src/workers/fileUploadWorker.js');
    const worker = new Worker(workerPath, {
      workerData: { filePath, mongodbUri }
    });

    worker.on('message', (msg) => resolve(msg));
    worker.on('error', (err) => reject(err));
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

async function testWorkerIngestion(mongodbUri) {
  console.log('\n--- Running Worker Thread Ingestion Test ---');

  const csvPath = path.resolve(__dirname, '../data/sample-data.csv');
  const result = await runWorker(csvPath, mongodbUri);

  console.log('Worker Result:', {
    success: result.success,
    totalRows: result.totalRows,
    processedCount: result.processedCount,
    upsertedPolicies: result.upsertedPolicies,
    durationMs: `${result.durationMs}ms`
  });

  if (!result.success) {
    throw new Error(`Worker thread failed: ${result.error}`);
  }

  // Verify all 6 distinct collections in MongoDB
  const [agentsCount, usersCount, accountsCount, categoriesCount, carriersCount, policiesCount] = await Promise.all([
    Agent.countDocuments(),
    User.countDocuments(),
    UserAccount.countDocuments(),
    PolicyCategory.countDocuments(),
    PolicyCarrier.countDocuments(),
    Policy.countDocuments()
  ]);

  console.log('MongoDB Collection Document Counts:');
  console.log(`  1. Agent Collection:           ${agentsCount} documents`);
  console.log(`  2. User Collection:            ${usersCount} documents`);
  console.log(`  3. UserAccount Collection:     ${accountsCount} documents`);
  console.log(`  4. PolicyCategory Collection:  ${categoriesCount} documents`);
  console.log(`  5. PolicyCarrier Collection:   ${carriersCount} documents`);
  console.log(`  6. Policy Collection:          ${policiesCount} documents`);

  if (agentsCount === 0 || usersCount === 0 || categoriesCount === 0 || carriersCount === 0 || policiesCount === 0) {
    throw new Error('Verification failed: One or more collections are empty after worker execution.');
  }

  // Verify relational linkage in Policy collection
  const samplePolicy = await Policy.findOne()
    .populate('agent')
    .populate('user')
    .populate('policyCategory')
    .populate('carrier')
    .populate('account');

  console.log('Sample Populated Policy Verification:');
  console.log(`  Policy Number: ${samplePolicy.policyNumber}`);
  console.log(`  Agent:         ${samplePolicy.agent?.agentName}`);
  console.log(`  User:          ${samplePolicy.user?.firstName}`);
  console.log(`  Category (LOB):${samplePolicy.policyCategory?.categoryName}`);
  console.log(`  Carrier:       ${samplePolicy.carrier?.companyName}`);
  console.log(`  Account:       ${samplePolicy.account?.accountName}`);

  if (!samplePolicy.user || !samplePolicy.policyCategory || !samplePolicy.carrier) {
    throw new Error('Policy collection IDs are missing or not properly linked.');
  }

  console.log('✓ Worker Thread file ingestion and 6 distinct collections verified successfully!');
}

module.exports = { testWorkerIngestion };
