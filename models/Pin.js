const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pinSchema = new Schema({
    pinHash: {
        type: String,
        required: true,
        unique: true // Assuming each hashed PIN should be unique
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
    // We might add more fields later, e.g., lockout attempts, lockoutUntil
});

module.exports = mongoose.model('Pin', pinSchema);