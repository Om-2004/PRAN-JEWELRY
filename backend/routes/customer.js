const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const CustomerTransaction = require('../models/Customer');
const Item = require('../models/Item'); // Still needed for Customer-Out
const mongoose = require('mongoose');

/**
 * 1) POST /api/customers
 * - Customer-In  => Records a transaction without touching inventory
 * - Customer-Out => Marks purchased Item as inactive in inventory
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            actionType,
            customerName,
            customerAddress,
            customerContact,
            metalType, // This is only for item-related metalType in Customer-Out
            paymentForm,
            purity,
            grams_given,
            equivalentAmount,
            cashAmount,
            otherPaymentNotes,
            jewelleryName,
            subtype,
            grossWeight,
            netWeight,
            itemMetalPurity,
            remarks,
            customerBalance
        } = req.body;

        // ── Basic validations ───────────────────────────────────────────────────────
        if (!['in', 'out'].includes(actionType)) {
            return res.status(400).json({ message: 'Invalid actionType.' });
        }
        if (!customerName || !customerAddress || !customerContact) {
            return res.status(400).json({ message: 'Missing customer details.' });
        }
        if (!['cash', 'cheque', 'gold', 'silver', 'other'].includes(paymentForm)) {
            return res.status(400).json({ message: 'Invalid paymentForm.' });
        }

        // Conditional validation for payment forms
        if (['gold', 'silver'].includes(paymentForm)) {
            if (purity === undefined || grams_given === undefined || equivalentAmount === undefined) {
                return res.status(400).json({ message: 'Missing metal payment details (purity, grams_given, equivalentAmount).' });
            }
        } else if (['cash', 'cheque'].includes(paymentForm)) {
            if (cashAmount === undefined) {
                return res.status(400).json({ message: 'Missing cash/cheque payment details (cashAmount).' });
            }
        } else if (paymentForm === 'other') {
            if (!otherPaymentNotes || typeof otherPaymentNotes !== 'string' || otherPaymentNotes.trim() === '') {
                return res.status(400).json({ message: 'Specify details for "Other" payment form.' });
            }
        }

        let linkedItemId = null;
        let transactionGroupId = new mongoose.Types.ObjectId().toHexString(); // Always create a unique group ID

        if (actionType === 'in') {
            // Customer-In: No item creation or inventory interaction
            // Only capture basic customer and payment details
            // Item-related fields will be null/undefined in the transaction record
        } else { // actionType === 'out'
            // Customer-Out: Requires item details to find and mark as inactive in inventory
            if (!jewelleryName || !subtype || grossWeight === undefined || netWeight === undefined || !itemMetalPurity || !metalType) {
                return res.status(400).json({ message: 'Missing item details for OUT transaction.' });
            }

            // Find the actual item in active inventory by its details and mark as inactive (soft delete)
            const itemToMarkInactive = await Item.findOneAndUpdate(
                {
                    jewelleryName,
                    subtype,
                    metalType, // Match on metalType for the item
                    vendorId: req.vendorId,
                    isActive: true // Only mark active items as inactive
                },
                { isActive: false },
                { new: true }
            );

            if (!itemToMarkInactive) {
                return res.status(400).json({ message: 'Requested item not found in active inventory for purchase.' });
            }
            linkedItemId = itemToMarkInactive._id;
        }

        // Save the CustomerTransaction itself
        const customerTx = new CustomerTransaction({
            actionType,
            customerName,
            customerAddress,
            customerContact,
            // metalType is for the item being transacted (only relevant for 'out')
            // For 'in' transactions, metalType will be null in the DB
            metalType: actionType === 'out' ? metalType : null,
            paymentForm,
            purity: purity !== undefined ? purity : null,
            grams_given: grams_given !== undefined ? grams_given : null,
            equivalentAmount: equivalentAmount !== undefined ? equivalentAmount : null,
            cashAmount: cashAmount !== undefined ? cashAmount : null,
            otherPaymentNotes: otherPaymentNotes || null,
            // Item details are only for 'out' transactions
            jewelleryName: actionType === 'out' ? jewelleryName : null,
            subtype: actionType === 'out' ? subtype : null,
            grossWeight: actionType === 'out' ? grossWeight : null,
            netWeight: actionType === 'out' ? netWeight : null,
            itemMetalPurity: actionType === 'out' ? itemMetalPurity : null,
            remarks,
            customerBalance: actionType === 'out' ? (customerBalance || "0") : null, // Only for 'out'
            linkedItemId: linkedItemId, // Will be null for 'in'
            status: 'completed', // All transactions are 'completed' as there's no pending/linking logic now
            transactionGroupId,
            vendorId: req.vendorId
        });
        const savedTx = await customerTx.save();
        return res.status(201).json({
            message: `Customer-${actionType} recorded.`,
            saved: savedTx
        });
    } catch (err) {
        console.error('Error in POST /api/customers:', err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        return res.status(500).json({ message: 'Internal server error.', error: err.message });
    }
});

/**
 * 2) GET /api/customers
 * - Return all customer transactions for this vendor
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const all = await CustomerTransaction
            .find({ vendorId: req.vendorId })
            .sort({ createdAt: -1 });
        return res.status(200).json(all);
    } catch (err) {
        console.error('GET /api/customers error:', err);
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 3) GET /api/customers/:id
 * - Return one customer transaction by ID
 */
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const one = await CustomerTransaction.findOne({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!one) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }
        return res.status(200).json(one);
    } catch (err) {
        console.error('GET /api/customers/:id error:', err);
        return res.status(500).json({ message: 'Invalid ID or internal error.' });
    }
});

/**
 * 4) PUT /api/customers/:id
 * - Update a customer transaction.
 * - Only allow update of relevant fields based on actionType.
 */
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const update = { ...req.body };

        const existing = await CustomerTransaction.findOne({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!existing) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        // --- Logic for updating fields based on actionType ---
        if (existing.actionType === 'in') {
            // For Customer-In, only allow updating basic customer, payment, and remarks fields
            const allowedFields = [
                'customerName', 'customerAddress', 'customerContact',
                'paymentForm', 'purity', 'grams_given', 'equivalentAmount',
                'cashAmount', 'otherPaymentNotes', 'remarks'
            ];
            for (const key in update) {
                if (!allowedFields.includes(key)) {
                    delete update[key]; // Remove disallowed fields from update payload
                }
            }
            // Ensure payment form specific fields are cleared if paymentForm changes
            if (update.paymentForm !== existing.paymentForm) {
                update.purity = null;
                update.grams_given = null;
                update.equivalentAmount = null;
                update.cashAmount = null;
                update.otherPaymentNotes = null;
            }
        } else { // existing.actionType === 'out'
            // For Customer-Out, item details are read-only as they point to an inactive item.
            // Only allow updating customer, payment, remarks, and customerBalance fields.
            const forbiddenItemFields = ['jewelleryName', 'subtype', 'grossWeight', 'netWeight', 'itemMetalPurity', 'metalType'];
            for (let f of forbiddenItemFields) {
                if (update[f] !== undefined && update[f] !== existing[f]) {
                    return res.status(400).json({ message: `Cannot change item details (${f}) on a Customer-Out transaction.` });
                }
            }
            // Ensure payment form specific fields are cleared if paymentForm changes
            if (update.paymentForm !== existing.paymentForm) {
                update.purity = null;
                update.grams_given = null;
                update.equivalentAmount = null;
                update.cashAmount = null;
                update.otherPaymentNotes = null;
            }
        }

        // Apply updates
        Object.assign(existing, update);
        const saved = await existing.save();
        return res.status(200).json({
            message: 'Customer transaction updated successfully.',
            updated: saved
        });
    } catch (err) {
        console.error('PUT /api/customers/:id error:', err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            }));
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        return res.status(400).json({ message: err.message || 'Update failed' });
    }
});

/**
 * 5) DELETE /api/customers/:id
 * - Delete a single customer transaction.
 * - If a Customer-Out, re-activate its corresponding Item.
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const toDelete = await CustomerTransaction.findOneAndDelete({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!toDelete) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        // If it was a Customer-Out and had a linked Item, mark that Item as active again
        if (toDelete.actionType === 'out' && toDelete.linkedItemId) {
            await Item.findByIdAndUpdate(toDelete.linkedItemId, { isActive: true });
        }

        return res.status(200).json({ message: 'Customer transaction deleted.' });
    } catch (err) {
        console.error('DELETE /api/customers/:id error:', err);
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 6) DELETE /api/customers
 * - Delete all customer transactions for this vendor (and re-activate linked Items from Customer-Out).
 */
router.delete('/', verifyToken, async (req, res) => {
    try {
        // Find all Customer-Out entries to re-activate their linked items
        const allOuts = await CustomerTransaction.find({
            actionType: 'out',
            vendorId: req.vendorId,
            linkedItemId: { $exists: true, $ne: null } // Ensure linkedItemId exists and is not null
        });

        for (let tx of allOuts) {
            await Item.findByIdAndUpdate(tx.linkedItemId, { isActive: true });
        }

        const result = await CustomerTransaction.deleteMany({ vendorId: req.vendorId });
        return res.status(200).json({ message: `Deleted ${result.deletedCount} transactions.` });
    } catch (err) {
        console.error('DELETE /api/customers error:', err);
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
