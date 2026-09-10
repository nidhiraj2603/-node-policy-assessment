const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    day: {
      type: String,
      required: [true, 'Day parameter is required'],
      trim: true
    },
    time: {
      type: String,
      required: [true, 'Time parameter is required'],
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Calculated scheduled timestamp is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'inserted', 'failed'],
      default: 'pending',
      index: true
    },
    insertedAt: {
      type: Date,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
