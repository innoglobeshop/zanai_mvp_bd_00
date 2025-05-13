const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function(req, res, next) {
    // Get token from header
    // As per your spec, token is issued on login. Frontend should send it in subsequent requests.
    // Common practice is to send it in the Authorization header as a Bearer token,
    // or a custom header like 'x-auth-token'. Let's use 'x-auth-token' for simplicity,
    // matching the functional requirements' implied token handling.
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        // FR-3.1: Token invalidation on logout or after 24 hours of inactivity.
        // The 'expiresIn' option during jwt.sign handles the 24h expiry.
        // Logout invalidation is typically handled client-side by discarding the token,
        // or server-side via a token blocklist (more complex, not in MVP scope).
        const decoded = jwt.verify(token, JWT_SECRET);

        // Add user from payload
        // Our payload in routes/auth.js was: { pin: { id: matchedPinDocument._id } }
        req.pin_id = decoded.pin.id; // Attach the pin's MongoDB _id to the request object
        next(); // Call the next middleware or route handler
    } catch (err) {
        // This catch block will handle expired tokens or invalid tokens
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token is expired, please log in again' });
        }
        res.status(401).json({ msg: 'Token is not valid' });
    }
};