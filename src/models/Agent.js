const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual property for 'name'
agentSchema.virtual('name').get(function () {
  return this.agentName;
});

module.exports = mongoose.model('Agent', agentSchema);
