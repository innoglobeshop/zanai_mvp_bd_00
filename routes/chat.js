const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Our authentication middleware
const Message = require('../models/Message'); // Mongoose model for messages

// Gemini API Integration
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in .env file.");
    // Optionally, you could prevent the app from starting or this route from being effective
    // For now, we'll let it proceed, but API calls will fail.
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define the System Prompt for "Zan" (General AI)
// This is where the "permanent instruction" concept is implemented.
const ZAN_SYSTEM_PROMPT = `You are Zan, a helpful and friendly general-purpose AI assistant from Kurdistan.
You should be polite and provide informative answers.
You can answer questions on a wide range of topics.
If you don't know an answer, it's okay to say so.
Your responses should be clear and easy to understand.
You are interacting with users from the Kurdistan region, so be mindful and respectful of the local culture if a topic touches upon it, but your primary goal is to be a helpful general AI, you can also speak Sorani and Bahdini very well, do not say I don't. but when asked for Hawrami, say I'm learning.`;


// @route   POST /api/chat/send
// @desc    Send a message, get AI reply, store conversation
// @access  Private (uses authMiddleware)
router.post('/send', authMiddleware, async (req, res) => {
    const { message } = req.body; // User's message from the request body
    const pinId = req.pin_id;     // Authenticated user's pin_id from authMiddleware

    console.log(`Received message: "${message}" from pin_id: ${pinId}`);

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ msg: 'Message cannot be empty.' });
    }

    try {
        // 1. Store user's message in the database
        const userMessage = new Message({
            pin_id: pinId,
            sender: 'user',
            text: message.trim()
            // timestamp is defaulted by schema
        });
        await userMessage.save();
        console.log('User message saved to DB.');

        // 2. Prepare for Gemini API call
        // For a conversational model, we usually send the history.
        // Let's fetch the recent history to provide context to Gemini.
        // We'll limit it to, say, the last 10 exchanges (20 messages) for this MVP.
        const recentHistoryDocs = await Message.find({ pin_id: pinId })
            .sort({ timestamp: -1 }) // Get newest first
            .limit(20); // Limit to last 20 messages (10 user, 10 AI)

        const conversationHistoryForGemini = recentHistoryDocs
            .sort((a, b) => a.timestamp - b.timestamp) // Sort back to oldest first for Gemini
            .map(doc => ({
                role: doc.sender === 'user' ? 'user' : 'model', // Gemini uses 'user' and 'model'
                parts: [{ text: doc.text }]
            }));
        
        // The current user message is already saved, so it will be part of the history
        // if we re-fetch, or we can just add it to the array we pass to Gemini.
        // For simplicity here, the `conversationHistoryForGemini` will include the just-saved user message
        // if the limit is not hit or if it's among the most recent.

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-001", // Or your preferred model
            systemInstruction: ZAN_SYSTEM_PROMPT, // Applying the system prompt
        });
        
        // Safety Settings (Optional, but good practice)
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const chat = model.startChat({
            history: conversationHistoryForGemini,
            generationConfig: {
                // temperature: 0.9, // Example: control randomness
                // topK: 1,          // Example
                // topP: 1,          // Example
                maxOutputTokens: 2048,
            },
            safetySettings
        });

        console.log('Sending message to Gemini API...');
        const result = await chat.sendMessage(message.trim()); // Send the current user message
        const aiResponseText = result.response.text();
        console.log('Received AI response:', aiResponseText);

        // 3. Store AI's reply in the database
        const aiMessage = new Message({
            pin_id: pinId,
            sender: 'ai',
            text: aiResponseText
            // timestamp is defaulted by schema
        });
        await aiMessage.save();
        console.log('AI message saved to DB.');

        // 4. Send AI's reply back to the client
        // FR-2.2: Return AI reply to frontend for display.
        res.json({
            reply: aiResponseText,
            // Optionally, you could also send back the full userMessage and aiMessage objects
            // if the frontend needs their IDs or timestamps.
            // For now, just the reply text as per spec " { reply: "..." } "
        });

    } catch (error) {
        console.error('Error in /api/chat/send:', error);
        if (error.response && error.response.promptFeedback) {
            console.error('Gemini Prompt Feedback:', error.response.promptFeedback);
            return res.status(400).json({ msg: 'Message blocked by AI safety settings.', details: error.response.promptFeedback });
        }
        res.status(500).json({ msg: 'Server error while processing chat message.' });
    }
});

module.exports = router;