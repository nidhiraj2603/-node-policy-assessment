const request = require('supertest');
const app = require('../src/app');
const scheduler = require('../src/services/scheduler.service');
const Message = require('../src/models/Message');
const ScheduledMessage = require('../src/models/ScheduledMessage');

async function testSchedulerService() {
  console.log('\n--- Running Scheduled Message Post-Service Tests (Task 2.2) ---');

  // Start the scheduler ticker
  scheduler.start();

  // Test 1: Schedule a message to be inserted 2 seconds from now
  const now = new Date();
  const future = new Date(now.getTime() + 2000);
  const dayStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}:${String(future.getSeconds()).padStart(2, '0')}`;

  console.log(`Scheduling message for Day: '${dayStr}', Time: '${timeStr}' (in ~2 seconds)...`);

  const scheduleRes = await request(app)
    .post('/api/messages/schedule')
    .send({
      message: 'Automated policy renewal notice for Q3',
      day: dayStr,
      time: timeStr
    });

  if (scheduleRes.status !== 201 || !scheduleRes.body.success) {
    throw new Error(`Schedule endpoint failed with status ${scheduleRes.status}: ${JSON.stringify(scheduleRes.body)}`);
  }

  const scheduledId = scheduleRes.body.data.id;
  console.log(`✓ Message successfully scheduled with ID: ${scheduledId}, status: 'pending'`);

  // Wait 3 seconds for scheduled day/time to strike and trigger DB insertion
  console.log('Waiting 3.5 seconds for target day and time to arrive...');
  await new Promise((r) => setTimeout(r, 3500));

  // Verify scheduled message status updated to 'inserted'
  const updatedScheduled = await ScheduledMessage.findById(scheduledId);
  console.log(`Scheduled record status in DB: '${updatedScheduled.status}'`);

  if (updatedScheduled.status !== 'inserted') {
    throw new Error(`Expected status 'inserted', got '${updatedScheduled.status}'`);
  }

  // Verify message inserted into destination Message collection
  const insertedMessage = await Message.findOne({ scheduledMessageId: scheduledId });
  if (!insertedMessage) {
    throw new Error('Message document not found in destination Message collection.');
  }

  console.log(`✓ Message document inserted into destination collection:`);
  console.log(`  ID: ${insertedMessage._id}`);
  console.log(`  Message: "${insertedMessage.message}"`);
  console.log(`  InsertedAt: ${insertedMessage.insertedAt}`);

  // Test GET endpoints
  const listRes = await request(app).get('/api/messages/inserted');
  if (listRes.status !== 200 || listRes.body.count === 0) {
    throw new Error('Failed to retrieve inserted messages list');
  }

  scheduler.stop();
  console.log('✓ Scheduled message DB insertion at specified day & time verified successfully!');
}

module.exports = { testSchedulerService };
