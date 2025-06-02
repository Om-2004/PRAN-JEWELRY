// routes/customer.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const CustomerTransaction = require('../models/Customer'); // matches models/Customer.js

// CREATE (Customer-IN / Customer-OUT)
router.post(
  '/',
  verifyToken,
  async (req, res) => {
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

      if (['gold', 'silver'].includes(paymentForm)) {
        if (!purity || !grams_given || typeof equivalentAmount !== 'number') {
          return res.status(400).json({ message: 'Missing metal payment details.' });
        }
      } else {
        if (typeof cashAmount !== 'number') {
          return res.status(400).json({ message: 'Missing cash/cheque payment details.' });
        }
      }

      if (actionType === 'out') {
        if (!jewelleryName || !subtype || !grossWeight || !netWeight || !metalPurity) {
          return res.status(400).json({ message: 'Missing jewelry details for OUT transaction.' });
        }
      }

      const customer = new CustomerTransaction({
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
        vendorId: req.vendorId
      });

      const saved = await customer.save();
      return res.status(201).json({
        message: `Customer-${actionType} recorded successfully.`,
        saved
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }
);

// READ - Get all customer transactions for this vendor
router.get(
  '/',
  verifyToken,
  async (req, res) => {
    try {
      const all = await CustomerTransaction
        .find({ vendorId: req.vendorId })
        .sort({ createdAt: -1 });
      return res.status(200).json(all);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// READ - Get a customer transaction by ID (only if vendor owns it)
router.get(
  '/:id',
  verifyToken,
  async (req, res) => {
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
      return res.status(500).json({ message: 'Invalid ID or internal error.' });
    }
  }
);

// DELETE - Remove all customer transactions for this vendor
router.delete(
  '/',
  verifyToken,
  async (req, res) => {
    try {
      await CustomerTransaction.deleteMany({ vendorId: req.vendorId });
      return res.status(200).json({ message: 'All customer transactions deleted.' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// DELETE - Remove a transaction by ID (only if vendor owns it)
router.delete(
  '/:id',
  verifyToken,
  async (req, res) => {
    try {
      const deleted = await CustomerTransaction.findOneAndDelete({
        _id: req.params.id,
        vendorId: req.vendorId
      });
      if (!deleted) {
        return res.status(404).json({ message: 'Transaction not found.' });
      }
      return res.status(200).json({
        message: 'Transaction deleted successfully.',
        deleted
      });
    } catch (err) {
      return res.status(500).json({ message: 'Invalid ID or internal error.' });
    }
  }
);

module.exports = router;
