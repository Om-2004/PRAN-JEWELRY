const express = require('express');
const app = express();
const connectDB = require('./config/db');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/metalRates', require('./routes/metalRate'));
app.use('/api/items', require('./routes/item'));
app.use('/api/karagirleisures', require('./routes/karagir'));
app.use('/api/vendors', require('./routes/vendor'));
app.use('/api/customers', require('./routes/customer'));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
