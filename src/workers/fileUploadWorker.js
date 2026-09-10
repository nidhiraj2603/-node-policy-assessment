const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const XLSX = require('xlsx');
const mongoose = require('mongoose');

// Models
const Agent = require('../models/Agent');
const User = require('../models/User');
const UserAccount = require('../models/UserAccount');
const PolicyCategory = require('../models/PolicyCategory');
const PolicyCarrier = require('../models/PolicyCarrier');
const Policy = require('../models/Policy');

/**
 * Worker thread execution for parsing CSV/XLSX and populating MongoDB collections
 */
async function processFile() {
  const { filePath, mongodbUri } = workerData;
  const startTime = Date.now();

  try {
    // Connect to MongoDB inside worker thread
    await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000
    });

    const ext = path.extname(filePath).toLowerCase();
    let rows = [];

    if (ext === '.csv') {
      rows = await readCsvFile(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      rows = readExcelFile(filePath);
    } else {
      throw new Error(`Unsupported file extension: ${ext}`);
    }

    if (!rows || rows.length === 0) {
      parentPort.postMessage({
        success: true,
        totalRows: 0,
        insertedCount: 0,
        message: 'File was empty. No records processed.',
        durationMs: Date.now() - startTime
      });
      return;
    }

    // In-memory caches to prevent redundant DB queries
    const agentCache = new Map();     // agentName -> _id
    const categoryCache = new Map();  // categoryName -> _id
    const carrierCache = new Map();   // companyName -> _id
    const userCache = new Map();      // email/phone -> _id
    const accountCache = new Map();   // accountName + userId -> _id

    let processedCount = 0;
    const policyBulkOps = [];

    const safeStr = (val, defaultVal = '') => {
      if (val === null || val === undefined) return defaultVal;
      return String(val).trim();
    };

    for (const row of rows) {
      // 1. Process Agent
      const agentName = safeStr(row.agent || row.Agent, 'Unknown Agent');
      let agentId = agentCache.get(agentName);
      if (!agentId && agentName) {
        let agentDoc = await Agent.findOne({ agentName });
        if (!agentDoc) {
          agentDoc = await Agent.create({ agentName });
        }
        agentId = agentDoc._id;
        agentCache.set(agentName, agentId);
      }

      // 2. Process Policy Category (LOB)
      const categoryName = safeStr(row.category_name || row.Category, 'General');
      let categoryId = categoryCache.get(categoryName);
      if (!categoryId && categoryName) {
        let catDoc = await PolicyCategory.findOne({ categoryName });
        if (!catDoc) {
          catDoc = await PolicyCategory.create({ categoryName });
        }
        categoryId = catDoc._id;
        categoryCache.set(categoryName, categoryId);
      }

      // 3. Process Policy Carrier (Company)
      const companyName = safeStr(row.company_name || row.Carrier, 'Standard Carrier');
      let carrierId = carrierCache.get(companyName);
      if (!carrierId && companyName) {
        let carrierDoc = await PolicyCarrier.findOne({ companyName });
        if (!carrierDoc) {
          carrierDoc = await PolicyCarrier.create({ companyName });
        }
        carrierId = carrierDoc._id;
        carrierCache.set(companyName, carrierId);
      }

      // 4. Process User
      const firstName = safeStr(row.firstname || row.firstName || row.first_name, 'Anonymous');
      const email = safeStr(row.email).toLowerCase();
      const phone = safeStr(row.phone || row.phoneNumber);
      const userKey = email || phone || `${firstName}_${safeStr(row.dob)}`;

      let userId = userCache.get(userKey);
      if (!userId) {
        const query = email ? { email } : (phone ? { phoneNumber: phone, firstName } : { firstName });
        let userDoc = await User.findOne(query);

        let parsedDob = null;
        if (row.dob) {
          const d = new Date(row.dob);
          if (!isNaN(d.getTime())) parsedDob = d;
        }

        const userData = {
          firstName: firstName,
          dob: parsedDob,
          address: safeStr(row.address),
          phoneNumber: phone,
          state: safeStr(row.state),
          zipCode: safeStr(row.zip || row.zipCode),
          email: email,
          gender: safeStr(row.gender),
          userType: safeStr(row.userType || row.user_type, 'Active Client'),
          city: safeStr(row.city)
        };

        if (!userDoc) {
          userDoc = await User.create(userData);
        } else {
          await User.updateOne({ _id: userDoc._id }, { $set: userData });
        }
        userId = userDoc._id;
        userCache.set(userKey, userId);
      }

      // 5. Process User's Account
      const accountName = safeStr(row.account_name || row.accountName, `${firstName}'s Account`);
      const accountKey = `${accountName}_${userId}`;
      let accountId = accountCache.get(accountKey);
      if (!accountId && accountName) {
        let accountDoc = await UserAccount.findOne({ accountName, user: userId });
        if (!accountDoc) {
          accountDoc = await UserAccount.create({
            accountName: accountName,
            accountType: safeStr(row.account_type),
            user: userId
          });
        }
        accountId = accountDoc._id;
        accountCache.set(accountKey, accountId);
      }

      // 6. Prepare Policy Info
      const policyNumber = safeStr(row.policy_number || row.policyNumber);
      if (policyNumber) {
        let startDate = new Date(row.policy_start_date || row.startDate || Date.now());
        let endDate = new Date(row.policy_end_date || row.endDate || Date.now());

        if (isNaN(startDate.getTime())) startDate = new Date();
        if (isNaN(endDate.getTime())) endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

        const premiumAmount = parseFloat(row.premium_amount || row.premium) || 0;
        const premiumWritten = parseFloat(row.premium_amount_written) || null;

        policyBulkOps.push({
          updateOne: {
            filter: { policyNumber: policyNumber },
            update: {
              $set: {
                policyNumber: policyNumber,
                policyStartDate: startDate,
                policyEndDate: endDate,
                policyCategory: categoryId,
                carrier: carrierId,
                user: userId,
                account: accountId,
                agent: agentId,
                policyMode: safeStr(row.policy_mode),
                producer: safeStr(row.producer),
                premiumAmount: premiumAmount,
                premiumAmountWritten: premiumWritten,
                policyType: safeStr(row.policy_type),
                csr: safeStr(row.csr)
              }
            },
            upsert: true
          }
        });
      }

      processedCount++;
    }

    // Execute bulk upsert for policies
    let bulkResult = null;
    if (policyBulkOps.length > 0) {
      bulkResult = await Policy.bulkWrite(policyBulkOps, { ordered: false });
    }

    const durationMs = Date.now() - startTime;

    parentPort.postMessage({
      success: true,
      totalRows: rows.length,
      processedCount: processedCount,
      upsertedPolicies: (bulkResult?.upsertedCount || 0) + (bulkResult?.modifiedCount || 0),
      agentsCount: agentCache.size,
      categoriesCount: categoryCache.size,
      carriersCount: carrierCache.size,
      usersCount: userCache.size,
      accountsCount: accountCache.size,
      durationMs: durationMs
    });
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: err.message,
      stack: err.stack
    });
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {}
  }
}

/**
 * Read and parse CSV file
 */
function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

/**
 * Read and parse Excel file (XLSX / XLS)
 */
function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Start processing in worker
processFile();
