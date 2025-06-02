// routes/karagir.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Karagir = require('../models/KaragirLeisure');
const Item = require('../models/Item');

// POST a new Karagir entry
router.post('/', verifyToken, async (req, res) => {
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

    if (!['in', 'out'].includes(actionType)) {
      return res.status(400).json({ message: 'Invalid actionType. Must be "in" or "out".' });
    }
    if (!['gold', 'silver'].includes(metalType)) {
      return res.status(400).json({ message: 'Invalid metalType. Must be "gold" or "silver".' });
    }
    if (!purity) {
      return res.status(400).json({ message: 'Purity is required.' });
    }
    if (actionType === 'out' && !grams) {
      return res.status(400).json({ message: 'Grams is required for Karagir-Out.' });
    }
    if (actionType === 'in' && (!ornamentName || !karatOrHUID || !grossWeight || !netWeight || !labourCharge || !subtype)) {
      return res.status(400).json({ message: 'Missing required fields for Karagir-In.' });
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
      remarks,
      vendorId: req.vendorId
    });

    const savedKaragir = await karagirData.save();

    let newItem = null;
    if (actionType === 'in') {
      newItem = new Item({
        jewelleryName: ornamentName,
        metalType,
        subtype,
        karatOrHUID,
        grossWeight,
        netWeight,
        sourceType: 'karagir',
        labourCharge,
        vendorId: req.vendorId
      });
      await newItem.save();
    }

    res.status(201).json({
      message: `Karagir-${actionType} recorded successfully.`,
      karagirEntry: savedKaragir,
      addedToInventory: newItem
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all Karagir entries for this vendor
router.get('/', verifyToken, async (req, res) => {
  try {
    const entries = await Karagir.find({ vendorId: req.vendorId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single Karagir entry
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const entry = await Karagir.findOne({ _id: req.params.id, vendorId: req.vendorId });
    if (!entry) return res.status(404).json({ message: 'Entry not found.' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update Karagir entry
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const karagirEntry = await Karagir.findOne({ _id: req.params.id, vendorId: req.vendorId });
    if (!karagirEntry) return res.status(404).json({ message: 'Entry not found.' });

    const isStatusChangingToCompleted = req.body.status === 'completed' && karagirEntry.status !== 'completed';
    const isOutEntry = karagirEntry.actionType === 'out';

    const updated = await Karagir.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.vendorId },
      req.body,
      { new: true }
    );

    let newItem = null;
    if (isStatusChangingToCompleted && !isOutEntry) {
      const exists = await Item.findOne({
        jewelleryName: karagirEntry.ornamentName,
        karatOrHUID: karagirEntry.karatOrHUID,
        metalType: karagirEntry.metalType,
        subtype: karagirEntry.subtype,
        grossWeight: karagirEntry.grossWeight,
        netWeight: karagirEntry.netWeight,
        labourCharge: karagirEntry.labourCharge,
        sourceType: 'karagir',
        vendorId: req.vendorId
      });

      if (!exists) {
        newItem = new Item({
          jewelleryName: karagirEntry.ornamentName,
          metalType: karagirEntry.metalType,
          subtype: karagirEntry.subtype,
          karatOrHUID: karagirEntry.karatOrHUID,
          grossWeight: karagirEntry.grossWeight,
          netWeight: karagirEntry.netWeight,
          labourCharge: karagirEntry.labourCharge,
          sourceType: 'karagir',
          vendorId: req.vendorId
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

// DELETE a Karagir entry
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await Karagir.findOneAndDelete({ _id: req.params.id, vendorId: req.vendorId });
    if (!deleted) return res.status(404).json({ message: 'Entry not found.' });
    res.json({ message: 'Entry deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
