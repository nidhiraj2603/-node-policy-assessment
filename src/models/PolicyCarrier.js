const mongoose = require('mongoose');

const policyCarrierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for company_name
policyCarrierSchema.virtual('company_name').get(function () {
  return this.companyName;
});

module.exports = mongoose.model('PolicyCarrier', policyCarrierSchema);
