"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklistMiddleware = exports.logout = exports.isBlacklisted = exports.addToBlacklist = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
// Simple in-memory token blacklist (for production, use Redis or database)
const tokenBlacklist = new Set();
const addToBlacklist = (token) => {
    tokenBlacklist.add(token);
};
exports.addToBlacklist = addToBlacklist;
const isBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};
exports.isBlacklisted = isBlacklisted;
const logout = async (req, res) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (token) {
            // Add to blacklist
            (0, exports.addToBlacklist)(token);
            console.log('Token blacklisted:', token.substring(0, 20) + '...');
        }
        // Also clear any cookies if used
        res.clearCookie('token');
        res.json({
            message: 'Logged out successfully',
            blacklisted: !!token
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};
exports.logout = logout;
// Export middleware that checks blacklist
const blacklistMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token && (0, exports.isBlacklisted)(token)) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
    }
    next();
};
exports.blacklistMiddleware = blacklistMiddleware;
router.post('/logout', exports.logout);
exports.default = router;
//# sourceMappingURL=logout.controller.js.map