// routes/customer.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const CustomerTransaction = require('../models/Customer');
const Item = require('../models/Item');

/**
 * 1) POST /api/customers
 *    - Customer-In  => create a new Item in inventory
 *    - Customer-Out => delete the purchased Item from inventory
 */
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
      jewelleryName,
      subtype,
      grossWeight,
      netWeight,
      metalPurity,
      remarks
    } = req.body;

    // ── Basic validations ───────────────────────────────────────────────────────
    if (!['in', 'out'].includes(actionType)) {
      return res.status(400).json({ message: 'Invalid actionType.' });
    }
    if (!customerName || !customerAddress || !customerContact) {
      return res.status(400).json({ message: 'Missing customer details.' });
    }
    if (!['gold', 'silver'].includes(metalType)) {
      return res.status(400).json({ message: 'Invalid metalType.' });
    }
    if (!['cash', 'cheque', 'gold', 'silver'].includes(paymentForm)) {
      return res.status(400).json({ message: 'Invalid paymentForm.' });
    }

    // If paymentForm is gold/silver, require purity, grams, equivalentAmount
    if (['gold', 'silver'].includes(paymentForm)) {
      if (!purity || !grams_given || typeof equivalentAmount !== 'number') {
        return res.status(400).json({ message: 'Missing metal payment details.' });
      }
    } else {
      // cash/cheque
      if (typeof cashAmount !== 'number') {
        return res.status(400).json({ message: 'Missing cash/cheque payment details.' });
      }
    }

    // If this is a purchase (Out), require item details
    let linkedItemId = null;
    if (actionType === 'out') {
      if (!jewelleryName || !subtype || !grossWeight || !netWeight || !metalPurity) {
        return res.status(400).json({ message: 'Missing jewelry details for OUT transaction.' });
      }

      // Find and delete the purchased item from inventory
      // We match on exact jewelleryName + subtype + vendorId.
      const foundItem = await Item.findOneAndDelete({
        jewelleryName,
        subtype,
        vendorId: req.vendorId
      });

      if (!foundItem) {
        return res.status(400).json({ message: 'Requested item not found in inventory.' });
      }
      linkedItemId = foundItem._id;
    }

    // If this is a customer selling in to us, create a new Item in inventory
    if (actionType === 'in') {
      const newItem = new Item({
        jewelleryName,
        metalType,
        purity,
        subtype,
        karatOrHUID: metalPurity,
        grossWeight,
        netWeight,
        sourceType: 'customer',
        labourCharge: 0,     // assume no labour charge on Customer-In
        vendorId: req.vendorId
      });
      const savedItem = await newItem.save();
      linkedItemId = savedItem._id;
    }

    // Save the CustomerTransaction itself
    const customerTx = new CustomerTransaction({
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
      jewelleryName,
      subtype,
      grossWeight,
      netWeight,
      metalPurity,
      remarks,
      linkedItemId,
      vendorId: req.vendorId
    });
    const savedTx = await customerTx.save();
    return res.status(201).json({
      message: `Customer-${actionType} recorded.`,
      saved: savedTx
    });
  } catch (err) {
    console.error('Error in POST /api/customers:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

/**
 * 2) GET /api/customers
 *    - Return all customer transactions for this vendor
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
 *    - Return one customer transaction by ID
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
 *    - Update a customer transaction.
 *    - If updating a Customer-In, propagate any item-related changes to the corresponding Item.
 *    - If updating a Customer-Out in a way that changes the linked item, we cannot “undelete” it; so only allow editing non-item fields.
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const update = { ...req.body };

    // Find existing transaction
    const existing = await CustomerTransaction.findOne({
      _id: req.params.id,
      vendorId: req.vendorId
    });
    if (!existing) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // If it was a Customer-In, and we are changing jewelleryName/subtype/grossWeight/netWeight/metalPurity,
    // then update the linked Item accordingly
    if (existing.actionType === 'in' && existing.linkedItemId) {
      const itemUpdates = {};
      if (update.jewelleryName) itemUpdates.jewelleryName = update.jewelleryName;
      if (update.metalType)      itemUpdates.metalType = update.metalType;
      if (update.purity)         itemUpdates.purity = update.purity;
      if (update.subtype)        itemUpdates.subtype = update.subtype;
      if (update.metalPurity)    itemUpdates.karatOrHUID = update.metalPurity;
      if (update.grossWeight)    itemUpdates.grossWeight = update.grossWeight;
      if (update.netWeight)      itemUpdates.netWeight = update.netWeight;
      // (labourCharge is zero for customer, so we skip)
      if (Object.keys(itemUpdates).length > 0) {
        await Item.findOneAndUpdate(
          { _id: existing.linkedItemId, vendorId: req.vendorId },
          itemUpdates,
          { new: true }
        );
      }
    }

    // If it was a Customer-Out, we cannot “restore” the deleted item. So do not allow changing jewelleryName, subtype, etc.
    if (existing.actionType === 'out') {
      // For simplicity, only allow editing non-item-related fields (customerName, address, contact, paymentForm, etc.)
      const forbiddenFields = ['jewelleryName','subtype','grossWeight','netWeight','metalPurity'];
      for (let f of forbiddenFields) {
        if (f in update && update[f] !== existing[f]) {
          return res.status(400).json({ message: `Cannot change ${f} on a Customer-Out` });
        }
      }
    }

    // Finally apply the rest of the updates
    Object.assign(existing, update);
    const saved = await existing.save();
    return res.status(200).json({
      message: 'Customer transaction updated successfully.',
      updated: saved
    });
  } catch (err) {
    console.error('PUT /api/customers/:id error:', err);
    return res.status(400).json({ message: err.message });
  }
});

/**
 * 5) DELETE /api/customers/:id
 *    - Delete a single customer transaction.
 *    - If a Customer-In, also delete its corresponding Item.
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

    // If it was a Customer-In, also remove the linked Item
    if (toDelete.actionType === 'in' && toDelete.linkedItemId) {
      await Item.findOneAndDelete({ _id: toDelete.linkedItemId, vendorId: req.vendorId });
    }

    return res.status(200).json({ message: 'Customer transaction deleted.' });
  } catch (err) {
    console.error('DELETE /api/customers/:id error:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * 6) DELETE /api/customers
 *    - Delete all customer transactions for this vendor (and any linked Items from Customer-In).
 */
router.delete('/', verifyToken, async (req, res) => {
  try {
    // Find all Customer-In entries first to delete their items
    const allIns = await CustomerTransaction.find({
      actionType: 'in',
      vendorId: req.vendorId,
      linkedItemId: { $exists: true }
    });

    for (let tx of allIns) {
      await Item.findOneAndDelete({ _id: tx.linkedItemId, vendorId: req.vendorId });
    }

    const result = await CustomerTransaction.deleteMany({ vendorId: req.vendorId });
    return res.status(200).json({ message: `Deleted ${result.deletedCount} transactions.` });
  } catch (err) {
    console.error('DELETE /api/customers error:', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
