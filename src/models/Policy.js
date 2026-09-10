const mongoose = require('mongoose');

// Ensure referenced models are registered in Mongoose
require('./PolicyCategory');
require('./PolicyCarrier');
require('./User');
require('./UserAccount');
require('./Agent');

const policySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: [true, 'Policy number is required'],
      trim: true,
      unique: true,
      index: true
    },
    policyStartDate: {
      type: Date,
      required: [true, 'Policy start date is required'],
      index: true
    },
    policyEndDate: {
      type: Date,
      required: [true, 'Policy end date is required'],
      index: true
    },
    // Reference to Policy Category (LOB) collection ID
    policyCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyCategory',
      required: [true, 'Policy category ID is required'],
      index: true
    },
    // Reference to Policy Carrier (Company) collection ID
    carrier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyCarrier',
      required: [true, 'Policy carrier (company) ID is required'],
      index: true
    },
    // Reference to User collection ID
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    // Reference to User's Account collection ID
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      index: true
    },
    // Reference to Agent collection ID
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      index: true
    },
    policyMode: {
      type: String,
      trim: true,
      default: ''
    },
    producer: {
      type: String,
      trim: true,
      default: ''
    },
    premiumAmount: {
      type: Number,
      default: 0
    },
    premiumAmountWritten: {
      type: Number,
      default: null
    },
    policyType: {
      type: String,
      trim: true,
      default: ''
    },
    csr: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Policy', policySchema);
