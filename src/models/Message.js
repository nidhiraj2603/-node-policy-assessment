const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true
    },
    scheduledMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledMessage'
    },
    insertedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Message', messageSchema);
