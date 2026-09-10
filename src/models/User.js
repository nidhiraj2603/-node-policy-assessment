const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      index: true
    },
    dob: {
      type: Date,
      default: null
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    zipCode: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: ''
    },
    gender: {
      type: String,
      trim: true,
      default: ''
    },
    userType: {
      type: String,
      trim: true,
      default: 'Active Client'
    },
    city: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast lookup
userSchema.index({ firstName: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);
