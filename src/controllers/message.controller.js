const schedulerService = require('../services/scheduler.service');
const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');

class MessageController {
  /**
   * Task 2.2: Post-service that takes message, day, and time in body parameters
   * and inserts that message into DB at that particular day and time.
   */
  async scheduleMessage(req, res, next) {
    try {
      const { message, day, time } = req.body;

      if (!message || !day || !time) {
        return res.status(400).json({
          success: false,
          message: "Required parameters missing. Please provide 'message', 'day', and 'time' in the request body.",
          example: {
            message: "Policy renewal reminder for client",
            day: "2026-09-15",
            time: "14:30"
          }
        });
      }

      const scheduledDoc = await schedulerService.scheduleMessage(message, day, time);

      return res.status(201).json({
        success: true,
        message: 'Message scheduled successfully. It will be inserted into the database at the designated day and time.',
        data: {
          id: scheduledDoc._id,
          message: scheduledDoc.message,
          day: scheduledDoc.day,
          time: scheduledDoc.time,
          scheduledAt: scheduledDoc.scheduledAt,
          status: scheduledDoc.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get list of scheduled messages
   */
  async getScheduledMessages(req, res, next) {
    try {
      const { status } = req.query;
      const query = status ? { status } : {};
      const messages = await ScheduledMessage.find(query).sort({ scheduledAt: -1 }).limit(100);

      return res.status(200).json({
        success: true,
        count: messages.length,
        data: messages
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get list of messages inserted into DB
   */
  async getInsertedMessages(req, res, next) {
    try {
      const messages = await Message.find().sort({ insertedAt: -1 }).limit(100);

      return res.status(200).json({
        success: true,
        count: messages.length,
        data: messages
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MessageController();
