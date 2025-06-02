// routes/item.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Item = require('../models/Item');

// GET all items for this vendor
router.get('/', verifyToken, async (req, res) => {
  try {
    const items = await Item.find({ vendorId: req.vendorId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single item by ID (only if it belongs to this vendor)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, vendorId: req.vendorId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new item (attach vendorId automatically)
router.post('/', verifyToken, async (req, res) => {
  const item = new Item({ ...req.body, vendorId: req.vendorId });
  try {
    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update an existing item
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updatedItem = await Item.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.vendorId },
      req.body,
      { new: true }
    );
    if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE an item
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deletedItem = await Item.findOneAndDelete({ _id: req.params.id, vendorId: req.vendorId });
    if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
