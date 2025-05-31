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
  purity: {              // New field for purity of metal for both in and out
    type: String,
    required: true
  },

  // For 'out' (metal given to karagir) - now this is metal given, so grams is required here
  grams: { 
    type: Number,
    required: function() { return this.actionType === 'out'; }
  },

  // For 'in' (ready-made ornament received from karagir)
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

  // status ONLY for 'out' (metal given to karagir)
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

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Karagir', KaragirSchema);
