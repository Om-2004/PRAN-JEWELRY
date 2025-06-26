// routes/vendor.js
const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for auth middleware

// Middleware to protect routes (Authentication)
// This should ideally be in a separate file like middleware/auth.js and imported.
const authMiddleware = (req, res, next) => {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if no token
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Extract token (remove 'Bearer ')
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided in Authorization header' });
  }

  // Verify token
  try {
    // Make sure process.env.JWT_SECRET is accessible here (e.g., loaded by dotenv)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.vendorId = decoded.vendorId; // Attach vendorId (MongoDB _id) from token to request
    req.shopName = decoded.shopName; // Also attach shopName if useful for logs/debugging
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};


// @route   GET /vendors
// @desc    Get all vendors
// This route does not require authentication
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
// This route does not strictly require authentication for reading,
// but you might want to protect it if vendor data is sensitive.
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json(vendor);
  } catch (err) {
    console.error(`Error fetching vendor ${req.params.id}:`, err.message);
    // CastError for invalid IDs will be caught here
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /vendors
// @desc    Create a new vendor (Registration)
// This route does not require authentication as it's for creating a new account.
router.post('/', async (req, res) => {
  try {
    const { shopName, contact, bisNumber, address, type } = req.body;

    if (!shopName || !contact || !bisNumber) {
      return res.status(400).json({ message: 'Missing required fields: shopName, contact, or bisNumber' });
    }

    // Check if vendor with this BIS number already exists
    const existingVendor = await Vendor.findOne({ bisNumber });
    if (existingVendor) {
      return res.status(409).json({ message: 'Vendor with this BIS number already exists' });
    }

    const newVendor = new Vendor({
      shopName,
      contact,
      bisNumber,
      address,
      type
    });

    const savedVendor = await newVendor.save();
    res.status(201).json(savedVendor);
  } catch (err) {
    console.error('Error creating vendor:', err.message);
    // Mongoose validation errors or other issues could lead to 400
    res.status(400).json({ message: err.message });
  }
});

// @route   PUT /vendors/:id
// @desc    Update a vendor
// This route should be protected. Only the owner can update their own account.
// Applying authMiddleware to ensure user is logged in.
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params; // This 'id' is the MongoDB _id of the vendor to update
    const { vendorId } = req; // This 'vendorId' is the MongoDB _id from the authenticated token

    // Ensure the authenticated user is updating their own vendor data
    // For this route, we assume req.params.id is the MongoDB _id
    if (id !== vendorId.toString()) { // Convert vendorId to string for comparison
      return res.status(403).json({ message: 'Forbidden: You can only update your own account.' });
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id, // Use the ID from params
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


// @route   DELETE /vendors/:bisNumber
// @desc    Delete a vendor's account by BIS number (protected and authorized)
// Applies authMiddleware to ensure user is logged in before processing.
router.delete('/:bisNumber', authMiddleware, async (req, res) => {
  try {
    const { bisNumber } = req.params; // This is the BIS Number passed in the URL
    const { vendorId } = req; // This is the MongoDB _id from the authenticated token

    // First, find the vendor by their BIS number
    const vendorToDelete = await Vendor.findOne({ bisNumber });

    if (!vendorToDelete) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Authorization check: Ensure the authenticated user (from token's _id)
    // is deleting their own account (by matching vendorToDelete._id with req.vendorId)
    if (vendorToDelete._id.toString() !== vendorId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own account.' });
    }

    // If authorized, proceed to delete
    await Vendor.findByIdAndDelete(vendorToDelete._id);

    res.status(200).json({ message: 'Vendor account deleted successfully' });
  } catch (err) {
    console.error(`Error deleting vendor by BIS number ${req.params.bisNumber}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
