const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  regularPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  salePrice: { 
    type: Number, 
    min: 0 
  },
  stock: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  description: { 
    type: String, 
    trim: true 
  },
  images: { 
    type: [String], 
    required: true 
  },
  tags: { 
    type: [String] 
  },
  status: { 
    type: String, 
    enum: ['In Stock', 'Out of Stock', 'Pre-order'], 
    default: 'In Stock' 
  },
  isBlocked: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
