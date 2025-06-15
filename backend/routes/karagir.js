const express = require('express');
const router = express.Router();
const verify = require('../middleware/auth');
const Karagir = require('../models/KaragirLeisure'); // Assuming KaragirLeisure is your model name
const Item = require('../models/Item');
const { v4: uuid } = require('uuid'); // npm install uuid

/**
 * 1) POST /api/karagirleisures
 * - Create a new Karagir entry (In or Out)
 * - If actionType === 'in', auto-mark matching 'out' as completed,
 * and create a new Item with purity + karagirEntryId.
 */
router.post('/', verify, async (req, res) => {
    try {
        const {
            actionType,
            metalType,
            purity,
            grams,
            ornamentName,
            labourCharge,
            // These fields now directly represent the specific purity type
            huidNo,      // Expected for gold
            karatCarat,  // Expected for silver/others
            grossWeight,
            netWeight,
            subtype,
            karagirName,
            remarks,
            balance
        } = req.body;

        // ── Basic validations ───────────────────────────────────────────────────────
        if (!['in', 'out'].includes(actionType)) {
            return res.status(400).json({ message: 'Invalid actionType. Must be "in" or "out".' });
        }
        // Updated metalType validation to include 'others'
        if (!['gold', 'silver', 'others'].includes(metalType)) {
            return res.status(400).json({ message: 'Invalid metalType. Must be "gold", "silver", or "others".' });
        }

        if (actionType === 'out' && (grams === undefined || grams === null || isNaN(parseFloat(grams)))) {
            return res.status(400).json({ message: 'Grams (a number) is required for Karagir-Out.' });
        }
        if (actionType === 'in' && (
            !ornamentName ||
            grossWeight === undefined || isNaN(parseFloat(grossWeight)) ||
            netWeight === undefined || isNaN(parseFloat(netWeight)) ||
            labourCharge === undefined || isNaN(parseFloat(labourCharge)) ||
            !subtype,
            balance === undefined || balance === null || balance.trim() === ''
        )) {
            return res.status(400).json({ message: 'Missing required fields for Karagir-In: ornamentName, grossWeight, netWeight, labourCharge, subtype.' });
        }

        // Additional validation for purity based on metalType for 'in' entries
        if (actionType === 'in') {
            if (metalType === 'gold') {
                if (!huidNo || !/^[a-zA-Z0-9]{6}$/.test(huidNo)) {
                    return res.status(400).json({ message: 'HUID No (6 digits) is required for gold items.' });
                }
            } else if (metalType === 'silver' || metalType === 'others') {
                if (!karatCarat) {
                    return res.status(400).json({ message: 'Karat/Carat is required for silver/other items.' });
                }
            }
        }

        const nameLC = karagirName ? karagirName.toLowerCase() : ''; // Ensure karagirName is handled

        // ── 1a) Handle “Out” ─────────────────────────────────────────────────────────
        if (actionType === 'out') {
            const outDoc = new Karagir({
                actionType,
                metalType,
                grams: parseFloat(grams),
                karagirName: nameLC,
                purity,
                remarks,
                status: 'pending',
                transactionId: uuid(), // Generate new transaction ID for 'out'
                vendorId: req.vendorId
            });
            await outDoc.save();
            return res.status(201).json({
                message: 'Karagir-Out recorded (pending).',
                karagirEntry: outDoc
            });
        }

        // ── 1b) Handle “In” ──────────────────────────────────────────────────────────
        // Mark earliest pending Out as completed
        const outDoc = await Karagir.findOneAndUpdate(
            {
                vendorId: req.vendorId,
                karagirName: nameLC,
                actionType: 'out',
                status: 'pending'
            },
            { status: 'completed' },
            { sort: { createdAt: 1 }, new: true }
        );

        if (!outDoc) {
            return res.status(400).json({ message: 'No pending Karagir-Out found for this karagir to mark as completed.' });
        }

        const inDocData = {
            actionType: 'in',
            metalType,
            ornamentName,
            labourCharge: parseFloat(labourCharge),
            grossWeight: parseFloat(grossWeight),
            netWeight: parseFloat(netWeight),
            subtype,
            karagirName: nameLC,
            balance,
            remarks,
            transactionId: outDoc.transactionId, // Link 'in' to 'out' transaction
            vendorId: req.vendorId
        };

        // Assign huidNo or karatCarat based on metalType for KaragirLeisure model
        if (metalType === 'gold') {
            inDocData.huidNo = huidNo;
            inDocData.karatCarat = undefined; // Ensure karatCarat is not stored for gold
        } else if (metalType === 'silver' || metalType === 'others') {
            inDocData.karatCarat = karatCarat;
            inDocData.huidNo = undefined; // Ensure huidNo is not stored for silver/others
        }

        const inDoc = new Karagir(inDocData);
        await inDoc.save();

        // Prepare item data for the Item model, mapping huidNo/karatCarat correctly
        const itemData = {
            jewelleryName: ornamentName,
            metalType,
            subtype,
            grossWeight: parseFloat(grossWeight),
            netWeight: parseFloat(netWeight),
            sourceType: 'karagir', // Item source type for karagir entries
            labourCharge: parseFloat(labourCharge),
            balance,
            vendorId: req.vendorId,
            karagirEntryId: inDoc._id // Link Item to the new 'in' Karagir entry
        };

        if (metalType === 'gold') {
            itemData.huidNo = huidNo;
            itemData.karatCarat = undefined; // Ensure karatCarat is unset for Item model
        } else if (metalType === 'silver' || metalType === 'others') {
            itemData.karatCarat = karatCarat;
            itemData.huidNo = undefined; // Ensure huidNo is unset for Item model
        }

        const item = new Item(itemData);
        await item.save();

        return res.status(201).json({
            message: 'Karagir-In recorded, pending-Out closed, Item created.',
            karagirEntry: inDoc,
            matchedOut: outDoc,
            newItem: item
        });
    } catch (err) {
        console.error('Error in POST /api/karagirleisures:', err);
        // Handle MongoDB duplicate key error specifically for HUID
        if (err.code === 11000 && err.keyPattern && err.keyPattern.huidNo) {
            return res.status(409).json({ message: 'Duplicate HUID No. A gold item with this HUID already exists.' });
        }
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
});

/**
 * 2) GET /api/karagirleisures
 * - Return all Karagir entries for this vendor, optionally filtered by query params.
 */
router.get('/', verify, async (req, res) => {
    try {
        const filter = { vendorId: req.vendorId };

        if (req.query.actionType) {
            filter.actionType = req.query.actionType;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.karagirName) {
            filter.karagirName = req.query.karagirName.toLowerCase();
        }

        const entries = await Karagir.find(filter).sort({ createdAt: -1 });
        return res.json(entries);
    } catch (err) {
        console.error('Error in GET /api/karagirleisures:', err);
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 3) GET /api/karagirleisures/:id
 * - Return one Karagir entry (must belong to this vendor).
 */
router.get('/:id', verify, async (req, res) => {
    try {
        const entry = await Karagir.findOne({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!entry) {
            return res.status(404).json({ message: 'Karagir entry not found.' });
        }
        return res.json(entry);
    } catch (err) {
        console.error('Error in GET /api/karagirleisures/:id', err);
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 4) PUT /api/karagirleisures/:id
 * - Update a Karagir entry (only if it belongs to this vendor).
 * - If this was originally an “in” entry and purity changed, update the corresponding Item.
 * - If an “out” flips status from completed→pending, delete its paired “in” and linked Item.
 * - Mirror certain out-field changes to paired in entry.
 */
router.put('/:id', verify, async (req, res) => {
    try {
        const {
            karagirName,
            metalType, // This comes from client, but we will use existing.metalType for logic
            purity,
            remarks,
            balance,
            grams,
            status,
            ornamentName,
            labourCharge,
            huidNo,      // Now expecting these directly
            karatCarat,  // Now expecting these directly
            grossWeight,
            netWeight,
            subtype
        } = req.body;

        // 4a) Find existing entry
        const existing = await Karagir.findOne({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!existing) {
            return res.status(404).json({ message: 'Karagir entry not found.' });
        }

        const beforeStatus = existing.status; // Save for status flip logic

        // Prepare update object, using existing metalType and actionType for logic consistency
        const updateFields = {
            karagirName: karagirName ? karagirName.toLowerCase() : existing.karagirName,
            remarks: remarks !== undefined ? remarks : existing.remarks,
            // metalType and actionType are generally not changeable on update,
            // using existing values for logic.
            // If they are explicitly sent in payload, they will be used, but UI disables them.
        };

        // Apply fields based on existing actionType
        if (existing.actionType === 'out') {
            updateFields.grams = parseFloat(grams) || 0;
            updateFields.status = status || 'pending';
            updateFields.purity = purity || existing.purity; // Purity for 'out'

            // Ensure 'in' specific fields are unset
            updateFields.ornamentName = undefined;
            updateFields.labourCharge = undefined;
            updateFields.purity = purity || '';
            updateFields.huidNo = undefined;
            updateFields.karatCarat = undefined;
            updateFields.grossWeight = undefined;
            updateFields.netWeight = undefined;
            updateFields.subtype = undefined;
            updateFields.balance = undefined; // Ensure balance is unset for 'out'

        } else if (existing.actionType === 'in') {
            updateFields.ornamentName = ornamentName !== undefined ? ornamentName : existing.ornamentName;
            updateFields.labourCharge = parseFloat(labourCharge) || 0;
            updateFields.grossWeight = parseFloat(grossWeight) || 0;
            updateFields.balance = balance !== undefined ? balance : existing.balance; // Update balance for 'in'
            updateFields.netWeight = parseFloat(netWeight) || 0;
            updateFields.subtype = subtype !== undefined ? subtype : existing.subtype;

            // Handle purity fields based on existing metalType
            if (existing.metalType === 'gold') {
                if (huidNo !== undefined && (!huidNo || !/^[a-zA-Z0-9]{6}$/.test(huidNo))) {
                    return res.status(400).json({ message: 'HUID No (6 digits) is required for gold items.' });
                }
                updateFields.huidNo = huidNo;
                updateFields.karatCarat = undefined; // Ensure karatCarat is unset
            } else if (existing.metalType === 'silver' || existing.metalType === 'others') {
                if (!karatCarat) {
                    return res.status(400).json({ message: 'Karat/Carat is required for silver/other items.' });
                }
                updateFields.karatCarat = karatCarat;
                updateFields.huidNo = undefined; // Ensure huidNo is unset
            }

            // Ensure 'out' specific fields are unset
            updateFields.grams = undefined;
            updateFields.status = undefined;
            updateFields.purity = undefined; // Purity is for 'out'
        } else {
            return res.status(400).json({ message: 'Invalid existing actionType for update.' });
        }

        // Apply updates and save
        const saved = await Karagir.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!saved) {
            return res.status(404).json({ message: 'Karagir entry not found after update attempt.' });
        }

        // 4c) If OUT updated … handle cascades
        if (saved.actionType === 'out') {
            const inDoc = await Karagir.findOne({
                transactionId: saved.transactionId,
                actionType: 'in',
                vendorId: req.vendorId
            });

            // A-1) status flip completed→pending: delete paired IN + Item
            if (beforeStatus === 'completed' && saved.status === 'pending' && inDoc) {
                await Karagir.deleteOne({ _id: inDoc._id });
                await Item.deleteOne({ karagirEntryId: inDoc._id });
            }

            // A-2) mirror metalType/karagirName to IN if it still exists
            if (inDoc) {
                // Only mirror if the field was updated in the OUT document
                if (updateFields.metalType !== undefined) {
                    inDoc.metalType = updateFields.metalType;
                }
                if (updateFields.karagirName !== undefined) {
                    inDoc.karagirName = updateFields.karagirName;
                }
                // No need to mirror huidNo/karatCarat from OUT to IN as OUT doesn't have them
                await inDoc.save();
            }
        }

        // 4d) If IN updated … sync to Item
        if (saved.actionType === 'in') {
            const itemUpdateFields = {
                jewelleryName: saved.ornamentName,
                metalType: saved.metalType,
                subtype: saved.subtype,
                grossWeight: saved.grossWeight,
                netWeight: saved.netWeight,
                labourCharge: saved.labourCharge,
                balance: saved.balance,
            };

            // Conditionally assign huidNo or karatCarat based on metalType for Item model
            if (saved.metalType === 'gold') {
                itemUpdateFields.huidNo = saved.huidNo;
                itemUpdateFields.karatCarat = undefined; // Explicitly unset
            } else if (saved.metalType === 'silver' || saved.metalType === 'others') {
                itemUpdateFields.karatCarat = saved.karatCarat;
                itemUpdateFields.huidNo = undefined; // Explicitly unset
            }

            await Item.findOneAndUpdate(
                { karagirEntryId: saved._id },
                { $set: itemUpdateFields },
                { new: true }
            );
        }

        return res.json({
            message: 'Karagir entry updated successfully.',
            updatedEntry: saved
        });
    } catch (err) {
        console.error('Error in PUT /api/karagirleisures/:id', err);
        if (err.code === 11000 && err.keyPattern && err.keyPattern.huidNo) {
            return res.status(409).json({ message: 'Duplicate HUID No. A gold item with this HUID already exists.' });
        }
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
});

/**
 * 5) DELETE /api/karagirleisures/:id
 * - Delete a single Karagir entry (only if it belongs to this vendor).
 * - Also delete its corresponding Item (if any) and paired entry.
 */
router.delete('/:id', verify, async (req, res) => {
    try {
        const deleted = await Karagir.findOneAndDelete({
            _id: req.params.id,
            vendorId: req.vendorId
        });
        if (!deleted) {
            return res.status(404).json({ message: 'Karagir entry not found.' });
        }

        // If this entry had a transactionId, remove its pair + linked Item
        if (deleted.transactionId) {
            await Karagir.deleteMany({
                transactionId: deleted.transactionId,
                _id: { $ne: deleted._id }, // Don't delete the one we just deleted
                vendorId: req.vendorId
            });
            // Delete items linked to this Karagir entry
            await Item.deleteMany({ karagirEntryId: deleted._id });
        }

        return res.json({ message: 'Karagir entry deleted successfully.' });
    } catch (err) {
        console.error('Error in DELETE /api/karagirleisures/:id', err);
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 6) DELETE /api/karagirleisures
 * - Delete ALL Karagir entries for this vendor (and their linked Items).
 */
router.delete('/', verify, async (req, res) => {
    try {
        const karagirEntriesToDelete = await Karagir.find({ vendorId: req.vendorId });
        const karagirEntryIds = karagirEntriesToDelete.map(entry => entry._id);

        await Karagir.deleteMany({ vendorId: req.vendorId });
        await Item.deleteMany({ karagirEntryId: { $in: karagirEntryIds }, vendorId: req.vendorId });

        return res.json({ message: `Deleted all Karagir entries and linked Items.` });
    } catch (err) {
        console.error('Error in DELETE /api/karagirleisures (all)', err);
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
