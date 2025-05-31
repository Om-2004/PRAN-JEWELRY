const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');

// @route   GET /vendors
// @desc    Get all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json(vendors);
  } catch (err) {
    console.error('Error fetching vendors:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /vendors/:id
// @desc    Get single vendor by MongoDB ID
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json(vendor);
  } catch (err) {
    console.error(`Error fetching vendor ${req.params.id}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /vendors
// @desc    Create a new vendor
router.post('/', async (req, res) => {
  try {
    const { shopName, contact, HUID_no, address, type } = req.body;

    console.log('Incoming Body:', req.body);

    if (!shopName || !contact || !HUID_no) {
      return res.status(400).json({ message: 'Missing required fields: shopName, contact, or HUID_no' });
    }

    const existingVendor = await Vendor.findOne({ HUID_no });
    if (existingVendor) {
      return res.status(409).json({ message: 'Vendor with this HUID number already exists' });
    }

    const newVendor = new Vendor({
      shopName,
      contact,
      HUID_no,
      address,
      type
    });

    const savedVendor = await newVendor.save();
    res.status(201).json(savedVendor);
  } catch (err) {
    console.error('Error creating vendor:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// @route   PUT /vendors/:id
// @desc    Update a vendor
router.put('/:id', async (req, res) => {
  try {
    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json(updatedVendor);
  } catch (err) {
    console.error(`Error updating vendor ${req.params.id}:`, err.message);
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /vendors/:id
// @desc    Delete a vendor
router.delete('/:id', async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!deletedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error(`Error deleting vendor ${req.params.id}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
