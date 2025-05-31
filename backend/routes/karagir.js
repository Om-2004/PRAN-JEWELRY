const express = require('express');
const router = express.Router();
const Karagir = require('../models/KaragirLeisure');
const Item = require('../models/Item');

// POST - Unified
router.post('/', async (req, res) => {
  try {
    const {
      actionType,
      metalType,
      purity,
      grams,
      ornamentName,
      labourCharge,
      karatOrHUID,
      grossWeight,
      netWeight,
      subtype,
      karagirName,
      remarks
    } = req.body;

    // Validate actionType and metalType
    if (!['in', 'out'].includes(actionType)) {
      return res.status(400).json({ message: 'Invalid actionType. Must be "in" or "out".' });
    }
    if (!['gold', 'silver'].includes(metalType)) {
      return res.status(400).json({ message: 'Invalid metalType. Must be "gold" or "silver".' });
    }
    if (!purity) {
      return res.status(400).json({ message: 'Purity is required.' });
    }

    // Validate fields depending on actionType with inverted logic
    if (actionType === 'out') {
      // 'out' = metal given to karagir
      if (!grams) {
        return res.status(400).json({ message: 'Grams is required for Karagir-Out (metal given).' });
      }
    } else if (actionType === 'in') {
      // 'in' = ready-made ornament received from karagir
      if (!ornamentName || !karatOrHUID || !grossWeight || !netWeight || !labourCharge || !subtype) {
        return res.status(400).json({ message: 'Missing required fields for Karagir-In (ornament received).' });
      }
    }

    const karagirData = new Karagir({
      actionType,
      metalType,
      purity,
      grams,
      ornamentName,
      labourCharge,
      karatOrHUID,
      grossWeight,
      netWeight,
      subtype,
      karagirName,
      remarks
    });

    const savedKaragir = await karagirData.save();

    // Auto-create Item entry logic inverted:
    // Add to Item if karagir-in (ornament received), NOT on karagir-out (metal given)
    let newItem = null;
    if (actionType === 'in') {
      newItem = new Item({
        jewelleryName: ornamentName,
        metalType,
        purity,
        karatOrHUID,
        grossWeight,
        netWeight,
        subtype,
        sourceType: 'karagir',
        labourCharge
      });

      await newItem.save();
    }

    res.status(201).json({
      message: `Karagir-${actionType} recorded successfully.`,
      karagirEntry: savedKaragir,
      addedToInventory: newItem
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET all
router.get('/', async (req, res) => {
  try {
    const entries = await Karagir.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one
router.get('/:id', async (req, res) => {
  try {
    const entry = await Karagir.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found.' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - Update Karagir entry and conditionally add item to inventory
router.put('/:id', async (req, res) => {
  try {
    const karagirEntry = await Karagir.findById(req.params.id);
    if (!karagirEntry) return res.status(404).json({ message: 'Entry not found.' });

    // Check if status is being changed to "completed" and actionType is "out" (metal given)
    const isStatusChangingToCompleted = req.body.status === 'completed' && karagirEntry.status !== 'completed';
    const isOutEntry = karagirEntry.actionType === 'out';

    // Update the Karagir entry
    const updated = await Karagir.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // If status is being changed to completed, and it’s an 'out' entry, no item creation here
    // Item creation logic only for 'in' (ornament received)
    let newItem = null;
    if (isStatusChangingToCompleted && !isOutEntry) {
      // That means 'in' entry status changed to completed - add item to inventory
      const exists = await Item.findOne({
        jewelleryName: karagirEntry.ornamentName,
        karatOrHUID: karagirEntry.karatOrHUID,
        metalType: karagirEntry.metalType,
        purity: karagirEntry.purity,
        grossWeight: karagirEntry.grossWeight,
        netWeight: karagirEntry.netWeight,
        labourCharge: karagirEntry.labourCharge,
        subtype: karagirEntry.subtype,
        sourceType: 'karagir'
      });

      if (!exists) {
        newItem = new Item({
          jewelleryName: karagirEntry.ornamentName,
          metalType: karagirEntry.metalType,
          purity: karagirEntry.purity,
          karatOrHUID: karagirEntry.karatOrHUID,
          grossWeight: karagirEntry.grossWeight,
          netWeight: karagirEntry.netWeight,
          labourCharge: karagirEntry.labourCharge,
          subtype: karagirEntry.subtype,
          sourceType: 'karagir'
        });

        await newItem.save();
      }
    }

    res.json({
      message: 'Karagir entry updated successfully.',
      updatedEntry: updated,
      addedToInventory: newItem
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Karagir.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Entry not found.' });
    res.json({ message: 'Entry deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
