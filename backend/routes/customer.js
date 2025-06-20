const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const CustomerTransaction = require('../models/Customer');
const Item = require('../models/Item');
const mongoose = require('mongoose');

// POST - Create new customer transaction
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            actionType,
            customerName,
            customerAddress,
            customerContact,
            metalType,
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
            customerBalance,
            isManualEntry = false // New field for manual entries
        } = req.body;

        // Basic validations
        if (!['in', 'out'].includes(actionType)) {
            return res.status(400).json({ message: 'Invalid actionType.' });
        }
        if (!customerName || !customerAddress || !customerContact) {
            return res.status(400).json({ message: 'Missing customer details.' });
        }
        if (!['cash', 'cheque', 'gold', 'silver', 'other'].includes(paymentForm)) {
            return res.status(400).json({ message: 'Invalid paymentForm.' });
        }

        // Payment form specific validations
        if (['gold', 'silver'].includes(paymentForm)) {
            if (purity === undefined || grams_given === undefined || equivalentAmount === undefined) {
                return res.status(400).json({ message: 'Missing metal payment details.' });
            }
        } else if (['cash', 'cheque'].includes(paymentForm)) {
            if (cashAmount === undefined) {
                return res.status(400).json({ message: 'Missing cash/cheque payment details.' });
            }
        } else if (paymentForm === 'other') {
            if (!otherPaymentNotes || otherPaymentNotes.trim() === '') {
                return res.status(400).json({ message: 'Specify details for "Other" payment form.' });
            }
        }

        let linkedItemId = null;
        const transactionGroupId = new mongoose.Types.ObjectId().toHexString();

        if (actionType === 'out') {
            // Validate item details for OUT transactions
            if (!jewelleryName || !subtype || grossWeight === undefined || 
                netWeight === undefined || !itemMetalPurity || !metalType) {
                return res.status(400).json({ message: 'Missing item details for OUT transaction.' });
            }

            // Only check inventory if it's NOT a manual entry
            if (!isManualEntry) {
                const itemToMarkInactive = await Item.findOneAndUpdate(
                    {
                        jewelleryName,
                        subtype,
                        metalType,
                        vendorId: req.vendorId,
                        isActive: true
                    },
                    { isActive: false },
                    { new: true }
                );

                if (!itemToMarkInactive) {
                    return res.status(400).json({ message: 'Requested item not found in active inventory.' });
                }
                linkedItemId = itemToMarkInactive._id;
            }
        }

        // Create the transaction
        const customerTx = new CustomerTransaction({
            actionType,
            customerName,
            customerAddress,
            customerContact,
            metalType: actionType === 'out' ? metalType : null,
            paymentForm,
            purity: purity !== undefined ? purity : null,
            grams_given: grams_given !== undefined ? grams_given : null,
            equivalentAmount: equivalentAmount !== undefined ? equivalentAmount : null,
            cashAmount: cashAmount !== undefined ? cashAmount : null,
            otherPaymentNotes: otherPaymentNotes || null,
            jewelleryName: actionType === 'out' ? jewelleryName : null,
            subtype: actionType === 'out' ? subtype : null,
            grossWeight: actionType === 'out' ? grossWeight : null,
            netWeight: actionType === 'out' ? netWeight : null,
            itemMetalPurity: actionType === 'out' ? itemMetalPurity : null,
            remarks,
            customerBalance: actionType === 'out' ? (customerBalance || "0") : null,
            linkedItemId,
            isManualEntry: actionType === 'out' ? isManualEntry : false,
            status: 'completed',
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

// GET - All customer transactions
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

// GET - Single customer transaction
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

// PUT - Update customer transaction (FIXED VERSION)
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

        // Prevent changing isManualEntry flag and actionType
        if ('isManualEntry' in update) delete update.isManualEntry;
        if ('actionType' in update) delete update.actionType;

        if (existing.actionType === 'in') {
            // For Customer-In: Allow updating all fields except item-related ones
            const allowedFields = [
                'customerName', 'customerAddress', 'customerContact',
                'paymentForm', 'purity', 'grams_given', 'equivalentAmount',
                'cashAmount', 'otherPaymentNotes', 'remarks'
            ];
            
            // Clear null values to prevent '-' display
            for (const field of ['purity', 'grams_given', 'equivalentAmount', 'cashAmount', 'otherPaymentNotes']) {
                if (update[field] === null || update[field] === '') {
                    update[field] = undefined; // Will be saved as null in DB
                }
            }

            // Handle payment form change
            if (update.paymentForm && update.paymentForm !== existing.paymentForm) {
                update.purity = undefined;
                update.grams_given = undefined;
                update.equivalentAmount = undefined;
                update.cashAmount = undefined;
                update.otherPaymentNotes = undefined;
            }

            // Remove disallowed fields
            for (const key in update) {
                if (!allowedFields.includes(key)) {
                    delete update[key];
                }
            }
        } else { // Customer-Out
            // For Customer-Out: Allow updating all fields except item details if not manual
            if (!existing.isManualEntry) {
                // For non-manual entries, item details are read-only
                const forbiddenItemFields = [
                    'jewelleryName', 'subtype', 'grossWeight', 
                    'netWeight', 'itemMetalPurity', 'metalType'
                ];
                for (let f of forbiddenItemFields) {
                    if (update[f] !== undefined && update[f] !== existing[f]) {
                        return res.status(400).json({ 
                            message: `Cannot change item details (${f}) on inventory-linked Customer-Out.` 
                        });
                    }
                }
            }

            // Handle payment form change
            if (update.paymentForm && update.paymentForm !== existing.paymentForm) {
                update.purity = undefined;
                update.grams_given = undefined;
                update.equivalentAmount = undefined;
                update.cashAmount = undefined;
                update.otherPaymentNotes = undefined;
            }

            // Clear null values for customerBalance
            if ('customerBalance' in update && (update.customerBalance === null || update.customerBalance === '')) {
                update.customerBalance = '0';
            }
        }

        // Apply updates
        Object.assign(existing, update);
        const saved = await existing.save();
        
        // Convert null values to empty strings for response to prevent '-' display
        const responseTx = saved.toObject();
        for (const key in responseTx) {
            if (responseTx[key] === null) {
                responseTx[key] = '';
            }
        }

        return res.status(200).json({
            message: 'Customer transaction updated successfully.',
            updated: responseTx
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

// DELETE - Single customer transaction
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const toDelete = await CustomerTransaction.findOneAndDelete({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!toDelete) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        // Reactivate item if it was a non-manual Customer-Out
        if (toDelete.actionType === 'out' && toDelete.linkedItemId && !toDelete.isManualEntry) {
            await Item.findByIdAndUpdate(toDelete.linkedItemId, { isActive: true });
        }

        return res.status(200).json({ message: 'Customer transaction deleted.' });
    } catch (err) {
        console.error('DELETE /api/customers/:id error:', err);
        return res.status(500).json({ message: err.message });
    }
});

// DELETE - All customer transactions
router.delete('/', verifyToken, async (req, res) => {
    try {
        // Find all non-manual Customer-Out entries to reactivate items
        const allOuts = await CustomerTransaction.find({
            actionType: 'out',
            vendorId: req.vendorId,
            linkedItemId: { $exists: true, $ne: null },
            isManualEntry: false
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