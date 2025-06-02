// models/MetalRate.js
const mongoose = require('mongoose');

const MetalRateSchema = new mongoose.Schema({
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver', 'platinum']
  },
  ratePerGram: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MetalRate', MetalRateSchema);
