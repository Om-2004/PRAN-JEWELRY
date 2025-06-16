const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth'); // Assuming this middleware extracts req.vendorId
const KaragirLeisure = require('../models/KaragirLeisure');
const Item = require('../models/Item'); // Make sure you have this model

// Middleware to protect routes (assuming verifyToken sets req.vendorId)
// All routes below this line will require authentication.
router.use(verifyToken);

// Helper function to check for pending Karagir-Out entries
const getPendingOutEntries = async (vendorId, karagirName, metalType) => {
    // Ensure karagirName is lowercased for the query, as it's stored lowercase in DB
    const lowercasedKaragirName = karagirName.toLowerCase();
    return await KaragirLeisure.find({
        vendorId,
        karagirName: lowercasedKaragirName, // Use lowercased name for query
        metalType, // metalType is already lowercased by schema enum
        entryType: 'out',
        status: 'pending'
    }).lean(); // .lean() for faster retrieval if you don't need Mongoose document methods
};

// @route   GET /api/karagir
// @desc    Get all Karagir entries for the authenticated vendor
// @access  Private
router.get('/', async (req, res) => {
    try {
        const karagirEntries = await KaragirLeisure.find({ vendorId: req.vendorId })
            .sort({ createdAt: -1 })
            .lean();
        res.json(karagirEntries);
    } catch (err) {
        console.error('Error in GET /api/karagir:', err);
        res.status(500).json({ message: 'Server error: Could not retrieve Karagir entries.' });
    }
});

// @route   GET /api/karagir/pending-out
// @desc    Check for pending Karagir-Out entries for a specific karagir and metal type
// @access  Private
// --- IMPORTANT: This route MUST come BEFORE /api/karagir/:id ---
router.get('/pending-out', async (req, res) => {
    try {
        const { karagirName, metalType } = req.query;
        if (!karagirName || !metalType) {
            return res.status(400).json({ message: 'Karagir name and metal type are required for pending-out check.' });
        }
        // Ensure karagirName is lowercased for the query
        const lowercasedKaragirName = karagirName.toLowerCase();

        const pendingOutEntriesCount = await KaragirLeisure.countDocuments({
            vendorId: req.vendorId,
            karagirName: lowercasedKaragirName, // Use lowercased name for query
            metalType,
            entryType: 'out',
            status: 'pending'
        });
        res.json({ hasPending: pendingOutEntriesCount > 0, count: pendingOutEntriesCount });
    } catch (err) {
        console.error('Error checking pending Karagir-Out entries:', err);
        res.status(500).json({ message: 'Server error during pending out check.' });
    }
});

// @route   GET /api/karagir/:id
// @desc    Get a single Karagir entry by ID for the authenticated vendor
// @access  Private
// --- IMPORTANT: This route MUST come AFTER /api/karagir/pending-out ---
router.get('/:id', async (req, res) => {
    try {
        const karagirEntry = await KaragirLeisure.findOne({ _id: req.params.id, vendorId: req.vendorId }).lean();
        if (!karagirEntry) {
            return res.status(404).json({ message: 'Karagir entry not found.' });
        }
        res.json(karagirEntry);
    } catch (err) {
        console.error('Error in GET /api/karagir/:id', err);
        // Handle CastError for invalid IDs (e.g., if a non-ObjectId string like 'pending-out' is passed)
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid Karagir entry ID format.' });
        }
        res.status(500).json({ message: 'Server error: Could not retrieve Karagir entry.' });
    }
});

// @route   POST /api/karagir
// @desc    Create a new Karagir entry (Karagir-Out or Karagir-In)
// @access  Private
router.post('/', async (req, res) => {
    const {
        entryType, karagirName, metalType, remarks,
        // Karagir-Out specific
        gramsGiven, purityGiven,
        // Karagir-In specific
        jewelleryName, subtype, huidNo, karatCarat, grossWeight, netWeight, purityReceived, labourCharge, balance
    } = req.body;

    // Ensure karagirName is lowercased before using in queries or creating the new entry
    const lowercasedKaragirName = karagirName ? karagirName.toLowerCase() : karagirName; // Handle potential undefined/null

    // Base data for the new entry
    let newEntryData = {
        vendorId: req.vendorId,
        karagirName: lowercasedKaragirName, // Use lowercased name
        metalType,
        remarks,
        entryType
    };

    try {
        if (entryType === 'out') {
            // Validate Karagir-Out specific fields
            if (gramsGiven === undefined || purityGiven === undefined) {
                return res.status(400).json({ message: 'Grams Given and Purity Given are required for Karagir-Out entry.' });
            }
            newEntryData = {
                ...newEntryData,
                gramsGiven: parseFloat(gramsGiven),
                purityGiven,
                status: 'pending' // Default status for Karagir-Out
            };
        } else if (entryType === 'in') {
            // Validate Karagir-In specific fields
            if (!jewelleryName || !subtype || grossWeight === undefined || netWeight === undefined ||
                purityReceived === undefined || labourCharge === undefined) {
                return res.status(400).json({ message: 'Missing required fields for Karagir-In entry.' });
            }

            // Check for pending Karagir-Out entries (though frontend also checks)
            // Use the lowercased name for this check as well
            const pendingOutEntries = await getPendingOutEntries(req.vendorId, lowercasedKaragirName, metalType);
            if (pendingOutEntries.length > 0) {
                console.log(`Karagir "${lowercasedKaragirName}" has ${pendingOutEntries.length} pending OUT entries for ${metalType}. Proceeding with IN entry.`);
                // Frontend is expected to show a popup. Backend proceeds.
            }

            // Prepare item data for automatic insertion into Item collection
            const itemData = {
                vendorId: req.vendorId,
                jewelleryName,
                metalType,
                subtype,
                grossWeight: parseFloat(grossWeight),
                netWeight: parseFloat(netWeight),
                purity: purityReceived, // Use purityReceived from Karagir-In
                sourceType: 'karagir', // Automatically set sourceType to 'karagir'
                labourCharge: parseFloat(labourCharge),
                balance: balance || "0", // Ensure balance is a string, default to "0"
            };

            // Handle HUID No / KaratCarat conditional logic for Item creation
            if (metalType === 'gold') {
                if (!huidNo) {
                    return res.status(400).json({ message: 'HUID No is required for gold items in Karagir-In.' });
                }
                if (!/^[a-zA-Z0-9]{6}$/.test(huidNo)) {
                    return res.status(400).json({ message: 'HUID No must be exactly 6 alphanumeric characters.', field: 'huidNo' });
                }
                // Check HUID uniqueness for Item model before saving
                const existingItemWithHUID = await Item.findOne({ huidNo: huidNo, metalType: 'gold' });
                if (existingItemWithHUID) {
                     return res.status(400).json({ message: 'HUID number already exists. It must be unique.', field: 'huidNo' });
                }
                itemData.huidNo = huidNo;
            } else {
                if (!karatCarat) {
                    return res.status(400).json({ message: 'Karat/Carat is required for silver/others metal types in Karagir-In.' });
                }
                itemData.karatCarat = karatCarat;
            }

            // Attempt to create the new Item first
            const newItem = new Item(itemData);
            let createdItem;
            try {
                createdItem = await newItem.save();
                console.log(`New Item created in inventory: ${createdItem._id}`);
            } catch (itemErr) {
                console.error('Error saving new Item from Karagir-In:', itemErr);
                // Mongoose validation errors
                if (itemErr.name === 'ValidationError') {
                    const errors = Object.values(itemErr.errors).map(e => ({ field: e.path, message: e.message }));
                    return res.status(400).json({ message: 'Item validation failed', errors });
                }
                // Other errors, potentially unique index errors (though HUID unique check is above)
                return res.status(400).json({ message: `Failed to create item in inventory: ${itemErr.message}` });
            }

            // Add Karagir-In specific fields to the entry data
            newEntryData = {
                ...newEntryData,
                jewelleryName,
                subtype,
                huidNo: metalType === 'gold' ? huidNo : undefined, // Only store HUID if gold
                karatCarat: metalType !== 'gold' ? karatCarat : undefined, // Only store Karat/Carat if silver/others
                grossWeight: parseFloat(grossWeight),
                netWeight: parseFloat(netWeight),
                purityReceived,
                labourCharge: parseFloat(labourCharge),
                balance: balance || "0",
                linkedItemId: createdItem._id, // Link to the newly created item
                status: 'completed' // Karagir-In entries are 'completed' by nature
            };

            // Optionally, try to find and update a corresponding pending Karagir-Out entry to 'completed'
            // We find the oldest pending 'out' entry for this karagir and metal type
            if (pendingOutEntries.length > 0) {
                const oldestPendingOut = pendingOutEntries.sort((a, b) => a.createdAt - b.createdAt)[0];
                await KaragirLeisure.findByIdAndUpdate(
                    oldestPendingOut._id,
                    { $set: { status: 'completed' } },
                    { new: true }
                );
                newEntryData.completesOutEntry = oldestPendingOut._id;
                console.log(`Marked Karagir-Out entry ${oldestPendingOut._id} as completed by this IN entry.`);
            }

        } else {
            return res.status(400).json({ message: 'Invalid entryType. Must be "in" or "out".' });
        }

        const karagirEntry = new KaragirLeisure(newEntryData);
        const newKaragirEntry = await karagirEntry.save();

        res.status(201).json(newKaragirEntry);

    } catch (err) {
        console.error('Error in POST /api/karagir:', err);
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        // Handle duplicate key errors (e.g., for transactionId)
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            const value = err.keyValue[field];
            return res.status(409).json({ message: `Duplicate value for ${field}: ${value}. It must be unique.`, field });
        }
        res.status(500).json({ message: err.message || 'Server error: An unexpected error occurred during Karagir entry creation.' });
    }
});

// @route   PUT /api/karagir/:id
// @desc    Update an existing Karagir entry for the authenticated vendor
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Prevent modification of vendorId, createdAt, entryType, transactionId
        delete updateData.vendorId;
        delete updateData.createdAt;
        delete updateData.entryType; // entryType should not change after creation
        delete updateData.transactionId; // transactionId should not change after creation

        // If karagirName is being updated, it will be lowercased by the setter in the model
        if (updateData.karagirName) {
            updateData.karagirName = updateData.karagirName.toLowerCase();
        }

        const existingEntry = await KaragirLeisure.findOne({ _id: id, vendorId: req.vendorId });
        if (!existingEntry) {
            return res.status(404).json({ message: 'Karagir entry not found for update.' });
        }

        // Apply specific field handling based on entryType during update
        if (existingEntry.entryType === 'out') {
            // For 'out' entries, ensure 'in' specific fields are not updated
            delete updateData.jewelleryName;
            delete updateData.subtype;
            delete updateData.huidNo;
            delete updateData.karatCarat;
            delete updateData.grossWeight;
            delete updateData.netWeight;
            delete updateData.purityReceived;
            delete updateData.labourCharge;
            delete updateData.balance;
            delete updateData.linkedItemId;
            delete updateData.completesOutEntry;
            // Convert gramsGiven to float if present
            if (updateData.gramsGiven !== undefined) {
                updateData.gramsGiven = parseFloat(updateData.gramsGiven);
            }
        } else if (existingEntry.entryType === 'in') {
            // For 'in' entries, ensure 'out' specific fields are not updated
            delete updateData.gramsGiven;
            delete updateData.purityGiven;
            // Prevent changing linkedItemId or completesOutEntry from client side
            delete updateData.linkedItemId;
            delete updateData.completesOutEntry;

            const currentMetalType = updateData.metalType || existingEntry.metalType;

            // Handle HUID No / KaratCarat conditional logic for existing 'in' entry update
            if (currentMetalType === 'gold') {
                if (updateData.huidNo === undefined || updateData.huidNo === null || updateData.huidNo === '') {
                    return res.status(400).json({ message: 'HUID No is required for gold items.', field: 'huidNo' });
                }
                if (!/^[a-zA-Z0-9]{6}$/.test(updateData.huidNo)) {
                    return res.status(400).json({ message: 'HUID No must be 6 alphanumeric characters.', field: 'huidNo' });
                }
                updateData.karatCarat = undefined; // Ensure karatCarat is unset
            } else {
                if (updateData.karatCarat === undefined || updateData.karatCarat === null || updateData.karatCarat === '') {
                    return res.status(400).json({ message: 'Karat/Carat is required for silver/others metal types.', field: 'karatCarat' });
                }
                updateData.huidNo = undefined; // Ensure huidNo is unset
            }

            // Convert number fields to float if present
            ['grossWeight', 'netWeight', 'labourCharge'].forEach(field => {
                if (updateData[field] !== undefined) {
                    updateData[field] = parseFloat(updateData[field]);
                }
            });
            // Ensure balance is string
            if (updateData.balance !== undefined) {
                updateData.balance = String(updateData.balance);
            }

            // If linkedItemId exists, attempt to update the corresponding Item
            if (existingEntry.linkedItemId) {
                const updatedItemData = {
                    jewelleryName: updateData.jewelleryName !== undefined ? updateData.jewelleryName : existingEntry.jewelleryName,
                    metalType: updateData.metalType !== undefined ? updateData.metalType : existingEntry.metalType,
                    subtype: updateData.subtype !== undefined ? updateData.subtype : existingEntry.subtype,
                    grossWeight: updateData.grossWeight !== undefined ? updateData.grossWeight : existingEntry.grossWeight,
                    netWeight: updateData.netWeight !== undefined ? updateData.netWeight : existingEntry.netWeight,
                    labourCharge: updateData.labourCharge !== undefined ? updateData.labourCharge : existingEntry.labourCharge,
                    balance: updateData.balance !== undefined ? String(updateData.balance) : existingEntry.balance, // Ensure string
                    purity: updateData.purityReceived !== undefined ? updateData.purityReceived : existingEntry.purityReceived
                };

                if (currentMetalType === 'gold') {
                    updatedItemData.huidNo = updateData.huidNo;
                    updatedItemData.karatCarat = undefined; // Unset if previously existed
                } else {
                    updatedItemData.karatCarat = updateData.karatCarat;
                    updatedItemData.huidNo = undefined; // Unset if previously existed
                }

                try {
                    const updatedItem = await Item.findByIdAndUpdate(
                        existingEntry.linkedItemId,
                        updatedItemData,
                        { new: true, runValidators: true, context: 'query' }
                    );
                    if (!updatedItem) {
                        console.warn(`Linked Item with ID ${existingEntry.linkedItemId} not found during Karagir-In update.`);
                    } else {
                        console.log(`Linked Item ${existingEntry.linkedItemId} updated successfully.`);
                    }
                } catch (itemErr) {
                    if (itemErr.code === 11000 && itemErr.keyPattern && itemErr.keyPattern.huidNo) {
                        return res.status(400).json({ message: 'HUID number already exists for another item. It must be unique.', field: 'huidNo' });
                    }
                    console.error('Error updating linked Item from Karagir-In:', itemErr);
                    return res.status(400).json({ message: `Failed to update linked item: ${itemErr.message}` });
                }
            }
        }

        const updatedKaragirEntry = await KaragirLeisure.findOneAndUpdate(
            { _id: id, vendorId: req.vendorId },
            updateData,
            { new: true, runValidators: true, context: 'query' } // runValidators to apply schema validations on update
        ).lean();

        if (!updatedKaragirEntry) {
            return res.status(404).json({ message: 'Karagir entry not found or you do not have permission to update it.' });
        }
        res.json(updatedKaragirEntry);

    } catch (err) {
        console.error('Error in PUT /api/karagir/:id', err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            }));
            return res.status(400).json({ message: 'Validation failed', errors });
        } else if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid Karagir entry ID format.' });
        } else if (err.code === 11000) { // Duplicate key error
            return res.status(400).json({ message: 'Duplicate key error. A unique field might already exist.', field: err.keyPattern ? Object.keys(err.keyPattern)[0] : 'unknown' });
        }
        res.status(500).json({ message: err.message || 'Server error: Update failed.' });
    }
});

// @route   DELETE /api/karagir/:id
// @desc    Delete a single Karagir entry by ID for the authenticated vendor
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEntry = await KaragirLeisure.findOneAndDelete({ _id: id, vendorId: req.vendorId });

        if (!deletedEntry) {
            return res.status(404).json({ message: 'Karagir entry not found or you do not have permission to delete it.' });
        }

        // If it was a Karagir-In entry, delete the linked Item as well
        if (deletedEntry.entryType === 'in' && deletedEntry.linkedItemId) {
            await Item.findByIdAndDelete(deletedEntry.linkedItemId);
            console.log(`Deleted linked Item ${deletedEntry.linkedItemId} for Karagir-In entry ${id}`);
        }

        // If this entry was completing an 'out' entry, reset that 'out' entry's status to 'pending'
        if (deletedEntry.entryType === 'in' && deletedEntry.completesOutEntry) {
            await KaragirLeisure.findByIdAndUpdate(deletedEntry.completesOutEntry, { $set: { status: 'pending' } });
            console.log(`Reset status of Karagir-Out entry ${deletedEntry.completesOutEntry} to pending after deleting its completing IN entry.`);
        }

        res.json({ message: 'Karagir entry deleted successfully.' });
    } catch (err) {
        console.error('Error in DELETE /api/karagir/:id', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid Karagir entry ID format.' });
        }
        res.status(500).json({ message: err.message || 'Server error: Could not delete Karagir entry.' });
    }
});

// @route   DELETE /api/karagir
// @desc    Delete all Karagir entries for the authenticated vendor (use with caution!)
// @access  Private
router.delete('/', async (req, res) => {
    try {
        // Find all Karagir-In entries for this vendor to identify linked items
        const karagirInEntries = await KaragirLeisure.find({ vendorId: req.vendorId, entryType: 'in' });
        const linkedItemIds = karagirInEntries.map(entry => entry.linkedItemId).filter(id => id); // Filter out null/undefined

        if (linkedItemIds.length > 0) {
            // Delete all items linked to these Karagir-In entries
            const itemDeleteResult = await Item.deleteMany({ _id: { $in: linkedItemIds }, vendorId: req.vendorId });
            console.log(`Deleted ${itemDeleteResult.deletedCount} linked items for vendor ${req.vendorId}.`);
        }

        // Now delete all Karagir entries (both 'in' and 'out') for the vendor
        const karagirDeleteResult = await KaragirLeisure.deleteMany({ vendorId: req.vendorId });

        res.json({ message: `Deleted ${karagirDeleteResult.deletedCount} Karagir entries and their linked items successfully.` });
    } catch (err) {
        console.error('Error in DELETE /api/karagir (all):', err);
        res.status(500).json({ message: err.message || 'Server error: Could not delete all Karagir entries.' });
    }
});

module.exports = router;
