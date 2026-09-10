const mongoose = require('mongoose');

const userAccountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      index: true
    },
    accountType: {
      type: String,
      trim: true,
      default: ''
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('UserAccount', userAccountSchema);
