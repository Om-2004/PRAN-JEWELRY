// models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  jewelleryName: {
    type: String,
    required: true
  },
  metalType: {
    type: String,
    required: true,
    lowercase: true,
    enum: ['gold', 'silver', 'others']
  },
  subtype: {
  type: String,
  required: true,
  validate: {
    validator: function(v) {
      // Get metalType from current document or update data
      const metal = this.metalType || (this._update && this._update.$set && this._update.$set.metalType);
      const m = (metal || '').toLowerCase();
      const val = v.toLowerCase();
      
      if (m === 'gold') {
        return ['regular gold jewellery', 'stone embedded gold jewellery'].includes(val);
      } else if (m === 'silver') {
        return ['regular silver jewellery', 'stone embedded silver jewellery'].includes(val);
      } else if (m === 'others') {
        return ['precious', 'semi-precious'].includes(val);
      }
      return false;
    },
    message: props => `Invalid subtype '${props.value}' for metalType ${this.metalType || 'unknown'}`
  }
},
  huidNo: {
  type: String,
  unique: true,
  required: function() {
    return (this.metalType || '').toLowerCase() === 'gold';
  },
  validate: {
    validator: function(v) {
      return /^[a-zA-Z0-9]{6}$/.test(v); // Changed to alphanumeric 6 characters
    },
    message: props => `${props.value} is not a valid 6-character alphanumeric HUID number!`
  }
},
  // In your Item.js model
karatCarat: {
  type: String,
  trim: true,
  required: function() {
    return ['silver', 'others'].includes(this.metalType);
  },
  validate: {
    validator: function(v) {
      // Only validate if metalType requires it
      if (!['silver', 'others'].includes(this.metalType)) return true;
      return v && v.length > 0; // Basic non-empty check
    },
    message: 'Karat/Carat is required for silver/other metal types'
  }
},
  grossWeight: {
    type: Number
  },
  netWeight: {
    type: Number
  },
  sourceType: {
    type: String,
    required: true,
    lowercase: true,
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
  balance: {
      type: String,
      default: "0",
      trim: true
    },
  karagirEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Karagir',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Add toJSON transform to include conditional fields in the output
  toJSON: {
    transform: function(doc, ret) {
      // For backward compatibility, include karatOrHUID field
      ret.karatOrHUID = doc.metalType === 'gold' ? doc.huidNo : doc.karatCarat;
      return ret;
    }
  }
});

// Add index for better performance on frequently queried fields
ItemSchema.index({ metalType: 1, subtype: 1 });
ItemSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('Item', ItemSchema);