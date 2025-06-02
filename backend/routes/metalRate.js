// routes/metalRate.js
const express = require('express');
const router = express.Router();
const MetalRate = require('../models/MetalRate');

// GET all rates (latest first)
router.get('/', async (req, res) => {
  try {
    const rates = await MetalRate.find().sort({ date: -1 });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET latest rate for a specific metal
router.get('/latest/:metalType', async (req, res) => {
  try {
    const rate = await MetalRate.findOne({ metalType: req.params.metalType })
      .sort({ date: -1 });
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    res.json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new metal rate
router.post('/', async (req, res) => {
  const rate = new MetalRate(req.body);
  try {
    const newRate = await rate.save();
    res.status(201).json(newRate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
