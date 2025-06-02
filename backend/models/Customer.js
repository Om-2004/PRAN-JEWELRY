// models/Customer.js
const mongoose = require('mongoose');

const CustomerTransactionSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  customerContact: {
    type: String,
    required: true
  },
  metalType: {
    type: String,
    enum: ['gold', 'silver'],
    required: true
  },
  paymentForm: {
    type: String,
    enum: ['cash', 'cheque', 'gold', 'silver'],
    required: true
  },
  purity: String,
  grams_given: Number,
  equivalentAmount: Number,
  cashAmount: Number,
  jewelleryName: String,
  subtype: String,
  grossWeight: Number,
  netWeight: Number,
  metalPurity: String,
  remarks: String,

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CustomerTransaction', CustomerTransactionSchema);
