// models/KaragirLeisure.js
const mongoose = require('mongoose');

const KaragirSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  metalType: {
    type: String,
    enum: ['gold', 'silver'],
    required: true
  },
  purity: {
    type: String,
    required: true
  },
  grams: {
    type: Number,
    required: function() { return this.actionType === 'out'; }
  },
  ornamentName: {
    type: String,
    required: function() { return this.actionType === 'in'; }
  },
  labourCharge: {
    type: Number,
    required: function() { return this.actionType === 'in'; }
  },
  karatOrHUID: {
    type: String,
    required: function() { return this.actionType === 'in'; }
  },
  grossWeight: {
    type: Number,
    required: function() { return this.actionType === 'in'; }
  },
  netWeight: {
    type: Number,
    required: function() { return this.actionType === 'in'; }
  },
  subtype: {
    type: String,
    required: function() { return this.actionType === 'in'; }
  },
  karagirName: String,
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: function() {
      return this.actionType === 'out' ? 'pending' : undefined;
    },
    required: function() {
      return this.actionType === 'out';
    }
  },
  remarks: String,

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Karagir', KaragirSchema);
