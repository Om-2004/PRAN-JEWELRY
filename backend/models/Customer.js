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
  // Only required if paymentForm is gold/silver
  purity: String,
  grams_given: Number,
  equivalentAmount: Number,

  // Only required if paymentForm is cash/cheque
  cashAmount: Number,

  // Required only when actionType === 'out'
  jewelleryName: String,
  subtype: String,
  grossWeight: Number,
  netWeight: Number,
  metalPurity: String,

  // Optional
  remarks: String
}, { timestamps: true });

module.exports = mongoose.model('CustomerTransaction', CustomerTransactionSchema);
