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
        enum: ['gold', 'silver', 'others', null],
        required: false
    },
    paymentForm: {
        type: String,
        enum: ['cash', 'cheque', 'gold', 'silver', 'other'],
        required: true
    },
    purity: String,
    grams_given: Number,
    equivalentAmount: Number,
    cashAmount: Number,
    otherPaymentNotes: String,
    jewelleryName: { type: String, required: false },
    subtype: { type: String, required: false },
    grossWeight: { type: Number, required: false },
    netWeight: { type: Number, required: false },
    itemMetalPurity: { type: String, required: false },
    remarks: String,
    customerBalance: { type: String, required: false },
    linkedItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: false
    },
    isManualEntry: {  // New field to track manual entries
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed'
    },
    transactionGroupId: {
        type: String,
        required: true,
        unique: true,
        default: () => new mongoose.Types.ObjectId().toHexString()
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    }
}, { timestamps: true });

// Indexes
CustomerTransactionSchema.index({ vendorId: 1, createdAt: -1 });
CustomerTransactionSchema.index({ customerName: 1, metalType: 1, jewelleryName: 1 });

module.exports = mongoose.model('CustomerTransaction', CustomerTransactionSchema);