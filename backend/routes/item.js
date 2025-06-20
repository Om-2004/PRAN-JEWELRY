// routes/item.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Item = require('../models/Item'); // Ensure this path is correct

// GET all items for this vendor
router.get('/', verifyToken, async (req, res) => {
    try {
        const items = await Item.find({ vendorId: req.vendorId })
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for better performance with large datasets

        // Transform items for backward compatibility (karatOrHUID)
        const transformedItems = items.map(item => ({
            ...item,
            // karatOrHUID is a computed property for frontend convenience
            karatOrHUID: item.metalType === 'gold' ? item.huidNo : item.karatCarat
        }));

        res.json(transformedItems);
    } catch (err) {
        console.error('Error in GET /api/items:', err); // Added detailed logging
        res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
});

// GET a single item by ID (only if it belongs to this vendor)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const item = await Item.findOne({ _id: req.params.id, vendorId: req.vendorId }).lean();
        if (!item) return res.status(404).json({ message: 'Item not found' });

        // Transform item for backward compatibility (karatOrHUID)
        const transformedItem = {
            ...item,
            karatOrHUID: item.metalType === 'gold' ? item.huidNo : item.karatCarat
        };

        res.json(transformedItem);
    } catch (err) {
        console.error('Error in GET /api/items/:id', err); // Added detailed logging
        res.status(500).json({ message: 'Invalid ID or an unexpected error occurred.' });
    }
});

// POST a new item (attach vendorId automatically)
router.post('/', verifyToken, async (req, res) => {
    try {
        // Start with the request body, and add vendorId and default isActive to true
        const itemData = {
            ...req.body,
            vendorId: req.vendorId,
            isActive: true // New items are active by default
        };

        // Refined logic for metal-specific fields
        if (itemData.metalType === 'gold') {
            itemData.huidNo = req.body.huidNo || req.body.karatOrHUID;
            itemData.karatCarat = undefined; // Ensure karatCarat is not saved for gold
        } else if (itemData.metalType === 'silver' || itemData.metalType === 'others') {
            itemData.karatCarat = req.body.karatCarat || req.body.karatOrHUID;
            itemData.huidNo = undefined; // Ensure huidNo is not saved for silver/others
        } else {
            itemData.huidNo = undefined;
            itemData.karatCarat = undefined;
        }

        // Remove the legacy field if it was passed, as it's now handled
        delete itemData.karatOrHUID;

        const item = new Item(itemData);
        const newItem = await item.save();

        // Transform response for backward compatibility (karatOrHUID)
        const responseItem = newItem.toObject();
        responseItem.karatOrHUID = newItem.metalType === 'gold' ? newItem.huidNo : newItem.karatCarat;

        res.status(201).json(responseItem);
    } catch (err) {
        console.error('Error in POST /api/items:', err); // Added detailed logging
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ message: 'Validation failed', errors });
        } else if (err.code === 11000) {
            // More descriptive error for duplicate HUID
            return res.status(400).json({
                message: 'HUID number must be unique',
                field: 'huidNo',
                metalType: req.body.metalType // Include metalType in error response
            });
        }
        res.status(400).json({
            message: err.message || 'An unexpected error occurred during item creation.',
            metalType: req.body.metalType // Helps debugging
        });
    }
});

// PUT update an existing item
router.put('/:id', verifyToken, async (req, res) => {
    try {
        // Start with the request body
        const updateData = { ...req.body };

        // Check if the item exists and get current metalType
        const existingItem = await Item.findById(req.params.id);
        if (!existingItem) {
            return res.status(404).json({ message: 'Item not found for update.' });
        }

        const currentMetalType = req.body.metalType || existingItem.metalType;

        // Handle metal-specific fields
        if (currentMetalType === 'gold') {
            const newHuidNo = req.body.huidNo || req.body.karatOrHUID;
            
            // Check if HUID is being changed and validate
            if (newHuidNo && newHuidNo !== existingItem.huidNo) {
                if (!/^[A-Za-z0-9]{6}$/.test(newHuidNo)) {
                    return res.status(400).json({
                        message: 'HUID must be exactly 6 alphanumeric characters',
                        field: 'huidNo'
                    });
                }
                
                // Check for duplicate HUID
                const existingWithHuid = await Item.findOne({ 
                    huidNo: newHuidNo,
                    metalType: 'gold',
                    _id: { $ne: req.params.id } // Exclude current item
                });
                
                if (existingWithHuid) {
                    return res.status(400).json({
                        message: 'HUID number must be unique for gold items',
                        field: 'huidNo'
                    });
                }
            }
            
            updateData.huidNo = newHuidNo;
            updateData.karatCarat = undefined;
        } else {
            updateData.karatCarat = req.body.karatCarat || req.body.karatOrHUID;
            updateData.huidNo = undefined;
        }

        // Remove legacy field
        delete updateData.karatOrHUID;

        // Perform the update
        const updatedItem = await Item.findOneAndUpdate(
            { _id: req.params.id, vendorId: req.vendorId },
            updateData,
            {
                new: true,
                runValidators: true,
                context: 'query',
                setDefaultsOnInsert: true
            }
        ).lean();

        if (!updatedItem) return res.status(404).json({ message: 'Item not found' });

        // Transform response for backward compatibility
        updatedItem.karatOrHUID = updatedItem.metalType === 'gold' ? updatedItem.huidNo : updatedItem.karatCarat;
        res.json(updatedItem);
    } catch (err) {
        console.error('Error in PUT /api/items/:id', err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            }));
            return res.status(400).json({
                message: 'Validation failed',
                errors
            });
        } else if (err.code === 11000) {
            return res.status(400).json({
                message: 'HUID number must be unique',
                field: 'huidNo'
            });
        }
        res.status(400).json({
            message: err.message || 'Update failed',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// DELETE an item
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const deletedItem = await Item.findOneAndDelete({ 
            _id: req.params.id, 
            vendorId: req.vendorId 
        });
        
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json({ message: 'Item permanently deleted' });
    } catch (err) {
        console.error('Error in DELETE /api/items/:id', err);
        res.status(500).json({ 
            message: err.message || 'Deletion failed' 
        });
    }
});

module.exports = router;