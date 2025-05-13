// Import necessary packages
require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001; // Use port from .env or default to 3001
const MONGO_URI = process.env.MONGO_URI; // Get MongoDB URI from .env

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON request bodies

// Basic Route (for testing)
app.get('/', (req, res) => {
    res.send('ZanAi MVP Backend is running!');
});

// --- NEW: MongoDB Connection ---
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1); // Exit the application if MONGO_URI is missing
}

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB Atlas!');
        // Start the server only after successful DB connection
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Error connecting to MongoDB Atlas:', err.message);
        process.exit(1); // Exit the application on connection error
    });
// --- END NEW: MongoDB Connection ---


// TODO: Define Mongoose Schemas & Models
// TODO: Define API Routes (login, chat, history)
// ... (other imports and middleware above) ...

// --- NEW: Define API Routes ---
app.use('/api/auth', require('./routes/auth'));


app.use('/api/chat', require('./routes/chat')); // <-- ADD THIS LINE

// ... (MongoDB connection and app.listen below) ...
// TODO: Add chat routes later
// --- END NEW: Define API Routes ---

// ... (MongoDB connection and app.listen below) ...
// --- REMOVE OLD SERVER START (if it was outside the mongoose.connect block) ---
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });