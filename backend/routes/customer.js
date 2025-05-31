const express = require('express');
const router = express.Router();
const CustomerTransaction = require('../models/Customer');

// CREATE (Customer-IN / Customer-OUT)
router.post('/', async (req, res) => {
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
      cashAmount,
      equivalentAmount,
      jewelleryName,
      subtype,
      grossWeight,
      netWeight,
      metalPurity,
      remarks
    } = req.body;

    // Validate actionType and customer details
    if (!['in', 'out'].includes(actionType)) return res.status(400).json({ message: 'Invalid actionType.' });
    if (!customerName || !customerAddress || !customerContact) return res.status(400).json({ message: 'Missing customer details.' });
    if (!['gold', 'silver'].includes(metalType)) return res.status(400).json({ message: 'Invalid metalType.' });
    if (!['cash', 'cheque', 'gold', 'silver'].includes(paymentForm)) return res.status(400).json({ message: 'Invalid paymentForm.' });

    // Validate payment fields
    if (['gold', 'silver'].includes(paymentForm)) {
      if (!purity || !grams_given || typeof equivalentAmount !== 'number') {
        return res.status(400).json({ message: 'Missing metal payment details.' });
      }
    } else {
      if (typeof cashAmount !== 'number') {
        return res.status(400).json({ message: 'Missing cash/cheque payment details.' });
      }
    }

    // Jewelry fields required for OUT
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
      cashAmount,
      equivalentAmount,
      jewelleryName,
      subtype,
      grossWeight,
      netWeight,
      metalPurity,
      remarks
    });

    const saved = await customer.save();
    res.status(201).json({ message: `Customer-${actionType} recorded successfully.`, saved });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// READ - Get all customer transactions
router.get('/', async (req, res) => {
  try {
    const all = await CustomerTransaction.find().sort({ createdAt: -1 });
    res.status(200).json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ - Get a customer transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const one = await CustomerTransaction.findById(req.params.id);
    if (!one) return res.status(404).json({ message: 'Transaction not found.' });
    res.status(200).json(one);
  } catch (err) {
    res.status(500).json({ message: 'Invalid ID or internal error.' });
  }
});

// DELETE - Remove all customer transactions
router.delete('/', async (req, res) => {
  try {
    await CustomerTransaction.deleteMany();
    res.status(200).json({ message: 'All customer transactions deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE - Remove a transaction by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CustomerTransaction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Transaction not found.' });
    res.status(200).json({ message: 'Transaction deleted successfully.', deleted });
  } catch (err) {
    res.status(500).json({ message: 'Invalid ID or internal error.' });
  }
});

module.exports = router;
