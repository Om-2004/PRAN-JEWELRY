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
    // metalType here specifically refers to the metal type of the JEWELLERY ITEM
    // It's required for 'out' transactions, but not directly for 'in' where no item is handled.
    metalType: {
        type: String,
        enum: ['gold', 'silver', 'others', null], // Allow null for 'in' transactions where no item is involved
        required: false // Not required at the schema level, handled by route logic
    },
    paymentForm: {
        type: String,
        enum: ['cash', 'cheque', 'gold', 'silver', 'other'],
        required: true
    },
    purity: String, // Purity of metal given (for paymentForm: gold/silver)
    grams_given: Number, // Grams given (for paymentForm: gold/silver)
    equivalentAmount: Number, // Equivalent amount (for paymentForm: gold/silver)
    cashAmount: Number, // Cash amount (for paymentForm: cash/cheque)
    otherPaymentNotes: String, // For paymentForm: other

    // Item-specific fields, now only applicable for Customer-Out
    jewelleryName: { type: String, required: false },
    subtype: { type: String, required: false },
    grossWeight: { type: Number, required: false },
    netWeight: { type: Number, required: false },
    itemMetalPurity: { type: String, required: false }, // HUID or Karat/Carat of the item

    remarks: String,
    customerBalance: { type: String, required: false }, // Only for Customer-Out

    linkedItemId: { // Link to the actual Item document in the inventory for OUT transactions
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed' // Default to completed, as 'in' no longer links to 'out' with a pending status
    },
    transactionGroupId: { // Always create a unique group ID, which handles indexing
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

// Removed the redundant index definition for transactionGroupId here.
CustomerTransactionSchema.index({ vendorId: 1, createdAt: -1 });
CustomerTransactionSchema.index({ customerName: 1, metalType: 1, jewelleryName: 1 });

module.exports = mongoose.model('CustomerTransaction', CustomerTransactionSchema);
