const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Import UUID generator

const KaragirLeisureSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    karagirName: {
        type: String,
        required: true,
        trim: true,
        // --- IMPORTANT CHANGE: Store karagirName in lowercase ---
        set: (v) => v.toLowerCase()
    },
    metalType: {
        type: String,
        required: true,
        lowercase: true,
        enum: ['gold', 'silver', 'others']
    },
    remarks: { // Optional remarks field for both in/out
        type: String,
        trim: true
    },
    entryType: { // 'in' or 'out'
        type: String,
        required: true,
        enum: ['in', 'out']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: { // 'pending' (for out entries) or 'completed' (when an in-entry matches an out-entry)
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending' // Default status for Karagir-Out
    },
    transactionId: {
        type: String,
        unique: true, // Ensures each transaction has a unique ID
        required: true, // This field must always be present
        default: uuidv4 // Automatically generate a UUID if not provided on creation
    },

    // Fields specific to Karagir-Out entries
    gramsGiven: {
        type: Number,
        required: function() { return this.entryType === 'out'; },
        min: [0, 'Grams Given cannot be negative'],
        validate: {
            validator: function(v) {
                return this.entryType !== 'out' || (v !== null && v !== undefined && v >= 0);
            },
            message: 'Grams Given is required for Karagir-Out entries and must be a non-negative number.'
        }
    },
    purityGiven: {
        type: String,
        required: function() { return this.entryType === 'out'; },
        trim: true
    },

    // Fields specific to Karagir-In entries
    jewelleryName: {
        type: String,
        required: function() { return this.entryType === 'in'; },
        trim: true
    },
    subtype: {
        type: String,
        required: function() { return this.entryType === 'in'; },
        validate: {
            validator: function(v) {
                const metal = this.metalType || '';
                const val = v.toLowerCase();
                if (metal === 'gold') {
                    return ['regular gold jewellery', 'stone embedded gold jewellery'].includes(val);
                } else if (metal === 'silver') {
                    return ['regular silver jewellery', 'stone embedded silver jewellery'].includes(val);
                } else if (metal === 'others') {
                    return ['precious', 'semi-precious'].includes(val);
                }
                return false;
            },
            message: props => `Invalid subtype '${props.value}' for metal type ${this.metalType || 'unknown'}`
        }
    },
    huidNo: {
        type: String,
        trim: true,
        required: function() { return this.entryType === 'in' && (this.metalType || '').toLowerCase() === 'gold'; },
        validate: {
            validator: function(v) {
                if (this.entryType === 'in' && (this.metalType || '').toLowerCase() === 'gold') {
                    return /^[a-zA-Z0-9]{6}$/.test(v);
                }
                return true;
            },
            message: props => `${props.value} is not a valid 6-character alphanumeric HUID number!`
        },
        sparse: true
    },
    karatCarat: {
        type: String,
        trim: true,
        required: function() { return this.entryType === 'in' && ['silver', 'others'].includes(this.metalType); },
        validate: {
            validator: function(v) {
                if (this.entryType === 'in' && ['silver', 'others'].includes(this.metalType)) {
                    return v && v.length > 0;
                }
                return true;
            },
            message: 'Karat/Carat is required for silver/other metal types in Karagir-In entries'
        }
    },
    grossWeight: {
        type: Number,
        required: function() { return this.entryType === 'in'; },
        min: [0, 'Gross Weight cannot be negative']
    },
    netWeight: {
        type: Number,
        required: function() { return this.entryType === 'in'; },
        min: [0, 'Net Weight cannot be negative']
    },
    purityReceived: {
        type: String,
        required: function() { return this.entryType === 'in'; },
        trim: true
    },
    labourCharge: {
        type: Number,
        required: function() { return this.entryType === 'in'; },
        min: [0, 'Labour Charge cannot be negative']
    },
    balance: {
        type: String,
        default: "0",
        trim: true
    },
    linkedItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: false
    },
    completesOutEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KaragirLeisure',
        required: false
    }
}, {
    timestamps: false
});

KaragirLeisureSchema.index({ vendorId: 1, karagirName: 1, entryType: 1, status: 1 });
KaragirLeisureSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('KaragirLeisure', KaragirLeisureSchema);
