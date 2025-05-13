const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    pin_id: { // This will store the _id of the Pin document
        type: Schema.Types.ObjectId,
        ref: 'Pin', // This creates a reference to the 'Pin' model
        required: true
    },
    sender: {
        type: String,
        required: true,
        enum: ['user', 'ai'] // Sender can only be 'user' or 'ai'
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);