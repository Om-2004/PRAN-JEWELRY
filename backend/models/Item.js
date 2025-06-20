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
        unique: true, // This implicitly creates a unique index, so schema.index() is redundant
        sparse: true, // Allows null values to not violate unique constraint
        required: function() {
            return (this.metalType || '').toLowerCase() === 'gold';
        },
        validate: {
            validator: function(v) {
                if ((this.metalType || '').toLowerCase() !== 'gold') return true; // Not required for non-gold
                return /^[a-zA-Z0-9]{6}$/.test(v); // Changed to alphanumeric 6 characters
            },
            message: props => `${props.value} is not a valid 6-character alphanumeric HUID number!`
        }
    },
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
        enum: ['manual', 'karagir', 'customer']
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
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: {
        transform: function(doc, ret) {
            ret.karatOrHUID = doc.metalType === 'gold' ? doc.huidNo : doc.karatCarat;
            return ret;
        }
    }
});

// Removed the redundant ItemSchema.index({ huidNo: 1 }, { unique: true, sparse: true });
ItemSchema.index({ metalType: 1, subtype: 1 });
ItemSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('Item', ItemSchema);
