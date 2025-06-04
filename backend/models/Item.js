// models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  jewelleryName: {
    type: String,
    required: true
  },
  metalType: {
    type: String,
    enum: ['gold', 'silver'],
    required: true
  },
  purity: {
    type: String,
    required: false          // now we store purity
  },
  subtype: {
    type: String,
    validate: {
      validator: function (value) {
        const allowedGoldSubtypes = [
          'regular gold jewellery',
          'stone gold embedded jewellery',
          'pure gold(24k)'
        ];
        const allowedSilverSubtypes = [
          'regular silver jewellery',
          'stone silver embedded jewellery',
          'pure silver 999'
        ];

        if (this.metalType === 'gold') {
          return allowedGoldSubtypes.includes(value.toLowerCase());
        } else if (this.metalType === 'silver') {
          return allowedSilverSubtypes.includes(value.toLowerCase());
        }
        return false;
      },
      message: props => `Invalid subtype '${props.value}' for metal type '${props.instance.metalType}'`
    },
    required: true
  },
  karatOrHUID: {
    type: String
  },
  grossWeight: {
    type: Number
  },
  netWeight: {
    type: Number
  },
  sourceType: {
    type: String,
    default: 'manual',
    enum: ['manual', 'karagir']
  },
  labourCharge: {
    type: Number
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  // --- new field: link back to the Karagir entry that spawned this item ---
  karagirEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Karagir',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', ItemSchema);
