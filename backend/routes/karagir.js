// routes/karagir.js

const express  = require('express');
const router   = express.Router();
const verify   = require('../middleware/auth');
const Karagir  = require('../models/KaragirLeisure');
const Item     = require('../models/Item');
const { v4: uuid } = require('uuid');   // npm install uuid

/**
 * 1) POST /api/karagirleisures
 *    - Create a new Karagir entry (In or Out)
 *    - If actionType === 'in', auto-mark matching 'out' as completed,
 *      and create a new Item with purity + karagirEntryId.
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
      karatOrHUID,
      grossWeight,
      netWeight,
      subtype,
      karagirName,
      remarks
    } = req.body;

    // ── Basic validations ───────────────────────────────────────────────────────
    if (!['in', 'out'].includes(actionType)) {
      return res.status(400).json({ message: 'Invalid actionType. Must be "in" or "out".' });
    }
    if (!['gold', 'silver'].includes(metalType)) {
      return res.status(400).json({ message: 'Invalid metalType. Must be "gold" or "silver".' });
    }
    if (!purity) {
      return res.status(400).json({ message: 'Purity is required.' });
    }
    if (actionType === 'out' && (grams === undefined || grams === null)) {
      return res.status(400).json({ message: 'Grams is required for Karagir-Out.' });
    }
    if (actionType === 'in' && (
        !ornamentName ||
        !karatOrHUID ||
        grossWeight === undefined ||
        netWeight === undefined ||
        labourCharge === undefined ||
        !subtype
      )) {
      return res.status(400).json({ message: 'Missing required fields for Karagir-In.' });
    }

    const nameLC = karagirName.toLowerCase();

    // ── 1a) Handle “Out” ─────────────────────────────────────────────────────────
    if (actionType === 'out') {
      const outDoc = new Karagir({
        actionType,
        metalType,
        purity,
        grams,
        karagirName: nameLC,
        remarks,
        status: 'pending',
        transactionId: uuid(),
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
      return res.status(400).json({ message: 'No pending Karagir-Out found for this karagir.' });
    }

    const inDoc = new Karagir({
      actionType: 'in',
      metalType,
      purity,
      ornamentName,
      labourCharge,
      karatOrHUID,
      grossWeight,
      netWeight,
      subtype,
      karagirName: nameLC,
      remarks,
      transactionId: outDoc.transactionId,
      vendorId: req.vendorId
    });
    await inDoc.save();

    const item = new Item({
      jewelleryName: ornamentName,
      metalType,
      purity,
      subtype,
      karatOrHUID,
      grossWeight,
      netWeight,
      sourceType: 'karagir',
      labourCharge,
      vendorId: req.vendorId,
      karagirEntryId: inDoc._id
    });
    await item.save();

    return res.status(201).json({
      message: 'Karagir-In recorded, pending-Out closed, Item created.',
      karagirEntry: inDoc,
      matchedOut: outDoc,
      newItem: item
    });
  } catch (err) {
    console.error('Error in POST /api/karagirleisures:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * 2) GET /api/karagirleisures
 *    - Return all Karagir entries for this vendor, optionally filtered by query params.
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
 *    - Return one Karagir entry (must belong to this vendor).
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
 *    - Update a Karagir entry (only if it belongs to this vendor).
 *    - If this was originally an “in” entry and purity changed, update the corresponding Item.
 *    - If an “out” flips status from completed→pending, delete its paired “in” and linked Item.
 *    - Mirror certain out-field changes to paired in entry.
 */
router.put('/:id', verify, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.karagirName) {
      update.karagirName = update.karagirName.toLowerCase();
    }

    // 4a) Find existing
    const existing = await Karagir.findOne({
      _id: req.params.id,
      vendorId: req.vendorId
    });
    if (!existing) {
      return res.status(404).json({ message: 'Karagir entry not found.' });
    }

    const beforeStatus = existing.status; // may be undefined for “in”

    // 4b) Apply updates
    Object.assign(existing, update);
    const saved = await existing.save();

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

      // A-2) mirror metalType/purity/karagirName to IN if it still exists
      if (inDoc) {
        ['metalType', 'purity', 'karagirName'].forEach(f => {
          inDoc[f] = saved[f];
        });
        await inDoc.save();
      }
    }

    // 4d) If IN updated … sync to Item
    if (saved.actionType === 'in') {
      await Item.findOneAndUpdate(
        { karagirEntryId: saved._id },
        {
          jewelleryName: saved.ornamentName,
          metalType    : saved.metalType,
          purity       : saved.purity,
          subtype      : saved.subtype,
          karatOrHUID  : saved.karatOrHUID,
          grossWeight  : saved.grossWeight,
          netWeight    : saved.netWeight,
          labourCharge : saved.labourCharge
        },
        { new: true }
      );
    }

    return res.json({
      message: 'Karagir entry updated successfully.',
      updatedEntry: saved
    });
  } catch (err) {
    console.error('Error in PUT /api/karagirleisures/:id', err);
    return res.status(400).json({ message: err.message });
  }
});

/**
 * 5) DELETE /api/karagirleisures/:id
 *    - Delete a single Karagir entry (only if it belongs to this vendor).
 *    - Also delete its corresponding Item (if any) and paired entry.
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
        _id: { $ne: deleted._id },
        vendorId: req.vendorId
      });
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
 *    - Delete ALL Karagir entries for this vendor (and their linked Items).
 */
router.delete('/', verify, async (req, res) => {
  try {
    const result = await Karagir.deleteMany({ vendorId: req.vendorId });
    await Item.deleteMany({ karagirEntryId: { $exists: true }, vendorId: req.vendorId });
    return res.json({ message: `Deleted ${result.deletedCount} Karagir entries.` });
  } catch (err) {
    console.error('Error in DELETE /api/karagirleisures (all)', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
