const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Pin = require('../models/Pin'); // Make sure this path is correct (../models/Pin.js)
const Message = require('../models/Message'); // Make sure this path is correct (../models/Message.js)

const JWT_SECRET = process.env.JWT_SECRET;

// @route   POST /api/auth/login
// @desc    Authenticate user (PIN) & get token and chat history
// @access  Public
router.post('/login', async (req, res) => {
    const { pin } = req.body;

    console.log('--- LOGIN ATTEMPT ---');
    console.log('Received PIN from request body:', pin);

    // Basic validation for the PIN format
    if (!pin || typeof pin !== 'string' || pin.length !== 6 || !/^\d+$/.test(pin)) {
        console.log('Validation failed: Invalid PIN format or type.');
        return res.status(400).json({ msg: 'Please enter a valid 6-digit PIN.' });
    }

    try {
        // Fetch all PIN documents from the database
        const allPinDocuments = await Pin.find({});
        console.log(`Found ${allPinDocuments.length} PIN document(s) in the database.`);

        let matchedPinDocument = null;

        // Iterate through each PIN document to find a match
        for (const currentPinDoc of allPinDocuments) {
            console.log('--- Iterating PIN Document ---');
            console.log('Current PinDoc ID from DB:', currentPinDoc._id);
            console.log('Current PinDoc.pinHash from DB:', currentPinDoc.pinHash); // Critical: The hash stored in DB
            console.log('Plaintext PIN from request for comparison:', pin);       // Critical: The PIN from Postman

            if (!currentPinDoc.pinHash) {
                console.log('Skipping document with missing pinHash, ID:', currentPinDoc._id);
                continue; // Skip if for some reason a document has no pinHash
            }

            // Compare the plaintext PIN from the request with the stored hash
            const isMatch = await bcrypt.compare(pin, currentPinDoc.pinHash);
            console.log('bcrypt.compare result for this document:', isMatch);

            if (isMatch) {
                matchedPinDocument = currentPinDoc;
                console.log('SUCCESS: PIN Matched for Document ID:', matchedPinDocument._id);
                break; // Exit loop once a match is found
            }
            console.log('--- End Iteration for this PinDoc (No Match) ---');
        }

        // If no matching PIN document was found after checking all
        if (!matchedPinDocument) {
            console.log('FAILURE: No matching PIN found after checking all documents.');
            // FR-1.3: On failure, return error; (lock out logic to be added later)
            return res.status(400).json({ msg: 'Invalid PIN.' });
        }

        // PIN is valid, proceed to fetch chat history and generate token
        console.log('Fetching chat history for matched Pin ID:', matchedPinDocument._id);
        const chatHistory = await Message.find({ pin_id: matchedPinDocument._id }).sort({ timestamp: 1 });
        console.log(`Found ${chatHistory.length} message(s) in history.`);

        // Create JWT Payload
        const payload = {
            pin: {
                id: matchedPinDocument._id // Use the MongoDB document ID for the user
            }
        };

        // Sign the JWT
        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '24h' }, // FR-3.1: Token expires after 24 hours
            (err, token) => {
                if (err) {
                    console.error('Error signing JWT:', err);
                    throw err; // This will be caught by the outer try-catch
                }
                console.log('Token generated successfully.');
                res.json({
                    success: true,
                    token,
                    history: chatHistory.map(msg => ({
                        from: msg.sender,
                        text: msg.text,
                        time: msg.timestamp
                    }))
                });
            }
        );

    } catch (err) {
        console.error('Server error during login process:', err.message);
        console.error(err.stack); // Log the full stack trace for more details
        res.status(500).send('Server error');
    }
});

module.exports = router;