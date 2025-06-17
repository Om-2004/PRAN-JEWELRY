const express = require('express');
const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { shopName, bisNumber } = req.body;

    const vendor = await Vendor.findOne({ shopName });

    if (!vendor || vendor.bisNumber !== bisNumber) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { vendorId: vendor._id, shopName: vendor.shopName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
