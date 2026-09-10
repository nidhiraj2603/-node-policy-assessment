const cron = require('node-cron');
const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');
const { parseScheduledDateTime } = require('../utils/dateHelper');
const logger = require('../utils/logger');
const config = require('../config');

class SchedulerService {
  constructor() {
    this.cronTask = null;
    this.isRunning = false;
    this.activeTimeouts = new Map();
  }

  /**
   * Schedule a message to be inserted into DB at given day and time
   * @param {string} message - Message text
   * @param {string} day - Day parameter
   * @param {string} time - Time parameter
   */
  async scheduleMessage(message, day, time) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error("Field 'message' is required and must be a non-empty string.");
    }

    // 1. Calculate exact scheduled datetime
    const scheduledAt = parseScheduledDateTime(day, time);

    // 2. Persist scheduled message record
    const scheduledDoc = await ScheduledMessage.create({
      message: message.trim(),
      day: day.trim(),
      time: time.trim(),
      scheduledAt: scheduledAt,
      status: 'pending'
    });

    logger.info(`Scheduled message [${scheduledDoc._id}] for ${scheduledAt.toISOString()} (Day: ${day}, Time: ${time})`);

    const now = Date.now();
    const delayMs = scheduledAt.getTime() - now;

    if (delayMs <= 0) {
      // Due immediately
      await this.executeMessage(scheduledDoc._id);
    } else if (delayMs <= 24 * 60 * 60 * 1000) {
      // Set high-precision in-memory timer for sub-day schedules
      this._setTimer(scheduledDoc._id, delayMs);
    }

    return scheduledDoc;
  }

  /**
   * Execute insertion of message into destination database collection
   */
  async executeMessage(scheduledId) {
    try {
      const scheduledDoc = await ScheduledMessage.findOneAndUpdate(
        { _id: scheduledId, status: 'pending' },
        { status: 'inserted', insertedAt: new Date() },
        { returnDocument: 'after' }
      );

      if (!scheduledDoc) {
        return; // Already executed by another worker or ticker
      }

      // Insert message into target collection
      const insertedDoc = await Message.create({
        message: scheduledDoc.message,
        scheduledMessageId: scheduledDoc._id,
        insertedAt: new Date(),
        metadata: {
          originalDay: scheduledDoc.day,
          originalTime: scheduledDoc.time,
          scheduledAt: scheduledDoc.scheduledAt
        }
      });

      logger.info(`[SCHEDULER SUCCESS] Inserted message [${insertedDoc._id}] at ${new Date().toISOString()}: "${insertedDoc.message}"`);

      // Clear timer reference if exists
      if (this.activeTimeouts.has(scheduledId.toString())) {
        clearTimeout(this.activeTimeouts.get(scheduledId.toString()));
        this.activeTimeouts.delete(scheduledId.toString());
      }

      return insertedDoc;
    } catch (err) {
      logger.error(`Error inserting scheduled message [${scheduledId}]:`, err.message);
      await ScheduledMessage.updateOne(
        { _id: scheduledId },
        { status: 'failed', error: err.message }
      ).catch(() => {});
    }
  }

  /**
   * Check and execute all overdue pending messages
   */
  async processDueMessages() {
    try {
      const now = new Date();
      const dueMessages = await ScheduledMessage.find({
        status: 'pending',
        scheduledAt: { $lte: now }
      }).limit(50);

      for (const msg of dueMessages) {
        await this.executeMessage(msg._id);
      }
    } catch (err) {
      logger.error('Error processing due messages in scheduler ticker:', err.message);
    }
  }

  _setTimer(id, delayMs) {
    const idStr = id.toString();
    if (this.activeTimeouts.has(idStr)) {
      clearTimeout(this.activeTimeouts.get(idStr));
    }

    const timer = setTimeout(async () => {
      await this.executeMessage(id);
    }, delayMs);

    this.activeTimeouts.set(idStr, timer);
  }

  /**
   * Start recurring scheduler ticker
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run immediately on boot to handle missed messages
    this.processDueMessages();

    // Periodic ticker every 5 seconds
    this.cronTask = cron.schedule('*/5 * * * * *', async () => {
      await this.processDueMessages();
    });

    logger.info('Message Scheduler Service started (ticker every 5 seconds).');
  }

  /**
   * Stop scheduler
   */
  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    for (const timer of this.activeTimeouts.values()) {
      clearTimeout(timer);
    }
    this.activeTimeouts.clear();
    this.isRunning = false;
    logger.info('Message Scheduler Service stopped.');
  }
}

const scheduler = new SchedulerService();
module.exports = scheduler;
