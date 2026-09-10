const request = require('supertest');
const app = require('../src/app');

async function testPolicyAPIs() {
  console.log('\n--- Running Policy Search & Aggregation API Tests ---');

  // Test 1: Search by username (e.g. "Lura")
  console.log('Testing GET /api/policies/search?username=Lura...');
  const searchRes = await request(app).get('/api/policies/search?username=Lura');

  if (searchRes.status !== 200 || !searchRes.body.success) {
    throw new Error(`Search API failed with status ${searchRes.status}: ${JSON.stringify(searchRes.body)}`);
  }

  console.log(`✓ Search API returned ${searchRes.body.data.policiesCount} policies for username 'Lura'.`);
  if (searchRes.body.data.policies.length > 0) {
    const p = searchRes.body.data.policies[0];
    console.log(`  Sample Policy: #${p.policyNumber}, User: ${p.user?.firstName}, LOB: ${p.policyCategory?.categoryName}, Carrier: ${p.carrier?.companyName}`);
  }

  // Test 2: Search with route param format (/api/policies/search/Torie)
  console.log('Testing GET /api/policies/search/Torie...');
  const searchParamRes = await request(app).get('/api/policies/search/Torie');
  if (searchParamRes.status !== 200 || !searchParamRes.body.success) {
    throw new Error(`Search by param failed: ${JSON.stringify(searchParamRes.body)}`);
  }
  console.log(`✓ Search by param returned ${searchParamRes.body.data.policiesCount} policies.`);

  // Test 3: Aggregated policy by each user
  console.log('Testing GET /api/policies/aggregated...');
  const aggRes = await request(app).get('/api/policies/aggregated');

  if (aggRes.status !== 200 || !aggRes.body.success) {
    throw new Error(`Aggregation API failed with status ${aggRes.status}: ${JSON.stringify(aggRes.body)}`);
  }

  const { totalUsersWithPolicies, aggregatedData } = aggRes.body.data;
  console.log(`✓ Aggregation API returned ${totalUsersWithPolicies} aggregated user groups.`);
  if (aggregatedData.length > 0) {
    const topUser = aggregatedData[0];
    console.log(`  Top User: ${topUser.userName} (${topUser.userEmail}) | Total Policies: ${topUser.totalPolicies} | Total Premium: $${topUser.totalPremium}`);
  }

  console.log('✓ Policy Search and User Aggregation APIs verified successfully!');
}

module.exports = { testPolicyAPIs };
