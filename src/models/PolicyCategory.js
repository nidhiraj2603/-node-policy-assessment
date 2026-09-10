const mongoose = require('mongoose');

const policyCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for category_name
policyCategorySchema.virtual('category_name').get(function () {
  return this.categoryName;
});

module.exports = mongoose.model('PolicyCategory', policyCategorySchema);
