const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  HUID_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required:true
  },
  type: {
    type: String,
    required:true,
    default: '',
    trim: true,
    enum: ['retailer','wholesaler']
  }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);
