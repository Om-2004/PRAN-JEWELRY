// backend/models/KaragirLeisure.js
const mongoose = require('mongoose');

const karagirLeisureSchema = new mongoose.Schema({
    actionType: {
        type: String,
        required: true,
        enum: ['in', 'out'] // Ensures only 'in' or 'out' are valid values
    },
    karagirName: {
        type: String,
        required: true,
        trim: true // Removes whitespace from both ends of a string
    },
    purity: {
        type: String,
        required: function() { return this.actionType === 'out'; }
    },
    metalType: {
        type: String,
        required: true,
        enum: ['gold', 'silver', 'others'] // Specifies allowed metal types
    },
    remarks: {
        type: String,
        default: '' // Provides a default empty string if no remarks are given
    },
    balance: {
        type: String,
        required: function() { return this.actionType === 'in'; }
    },
    // Fields specific to 'out' actionType
    grams: {
        type: Number,
        min: 0, // Grams cannot be negative
        required: function() { return this.actionType === 'out'; } // Required only when actionType is 'out'
    },
    status: {
        type: String,
        enum: ['pending', 'completed'], // Only these two statuses are allowed
        default: 'pending', // Default status for 'out' entries
        required: function() { return this.actionType === 'out'; } // Required only when actionType is 'out'
    },
    // Fields specific to 'in' actionType
    ornamentName: {
        type: String,
        required: function() { return this.actionType === 'in'; } // Required only when actionType is 'in'
    },
    labourCharge: {
        type: Number,
        min: 0, // Labour charge cannot be negative
        required: function() { return this.actionType === 'in'; } // Required only when actionType is 'in'
    },
    // HUID No: Required only if metalType is 'gold' and actionType is 'in'
    huidNo: {
        type: String,
        trim: true,
        sparse: true,
        required: function() { return this.actionType === 'in' && this.metalType === 'gold'; },
        validate: {
            validator: function(v) {
            if (this.actionType === 'in' && this.metalType === 'gold') {
                return v && /^[a-zA-Z0-9]{6}$/.test(v); // Alphanumeric 6 characters
            }
            return true;
            },
            message: props => `${props.value} is not a valid 6-digit HUID No for gold!`
        }
    },
    // Karat/Carat: Required if metalType is 'silver' or 'others' and actionType is 'in'
    karatCarat: {
        type: String,
        trim: true,
        required: function() { return this.actionType === 'in' && (this.metalType === 'silver' || this.metalType === 'others'); }
    },
    grossWeight: {
        type: Number,
        min: 0, // Gross weight cannot be negative
        required: function() { return this.actionType === 'in'; } // Required only when actionType is 'in'
    },
    netWeight: {
        type: Number,
        min: 0, // Net weight cannot be negative
        required: function() { return this.actionType === 'in'; }, // Required only when actionType is 'in'
        validate: {
            validator: function(v) {
                // If it's an 'in' entry, net weight must be less than or equal to gross weight
                return this.actionType === 'out' || (v <= this.grossWeight);
            },
            message: 'Net weight cannot be greater than gross weight!'
        }
    },
    subtype: {
        type: String,
        required: function() { return this.actionType === 'in'; }, // Required only when actionType is 'in'
        trim: true
    },
    transactionId: {
        type: String,
        required: true, // Each Karagir entry should have a transaction ID
        unique: true // Ensures uniqueness for transaction linking
    },
    vendorId: {
        type: String,
        required: true // Links entries to a specific vendor
    }
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps automatically

// It's important to remember that the unique index for 'huidNo' with partialFilterExpression
// should be created directly in MongoDB to handle null/missing values correctly,
// as Mongoose's `unique: true` property doesn't support partial indexing directly.
// Example MongoDB command (as previously discussed):
// db.your_karagir_collection_name.createIndex(
//    { huidNo: 1 },
//    {
//      unique: true,
//      partialFilterExpression: { metalType: "gold", huidNo: { $exists: true, $ne: null } }
//    }
// )

const KaragirLeisure = mongoose.model('KaragirLeisure', karagirLeisureSchema);

module.exports = KaragirLeisure;
