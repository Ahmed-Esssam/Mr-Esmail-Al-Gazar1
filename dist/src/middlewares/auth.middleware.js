"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApprovedUser = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const logout_controller_1 = require("../controllers/logout.controller");
const prisma = new client_1.PrismaClient();
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: 'No authorization header' });
            return;
        }
        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Invalid authorization format' });
            return;
        }
        // Bulletproof token extraction:
        //  1. Take everything after the first space (handles "Bearer <token>")
        //  2. Strip any accidental single/double quotes (JSON-encoded tokens)
        //  3. Guard against a doubly-prefixed "Bearer Bearer <token>" header
        let rawToken = authHeader.split(' ')[1] ?? '';
        // If "Bearer " was accidentally embedded inside the token value itself
        if (rawToken.toLowerCase().startsWith('bearer ')) {
            rawToken = rawToken.substring(7);
        }
        const token = rawToken.replace(/['"]+/g, '').trim();
        if (!token) {
            res.status(401).json({ error: 'Token is empty' });
            return;
        }
        // Check if token is blacklisted
        if ((0, logout_controller_1.isBlacklisted)(token)) {
            res.status(401).json({ error: 'Token has been revoked. Please login again.' });
            return;
        }
        // DEBUG: Log first 20 chars so malformed / quoted tokens are immediately visible
        console.log('DEBUG: Verifying token ->', token.substring(0, 20) + '...');
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            console.log('🔑 Token verified successfully for user:', decoded.phone, 'role:', decoded.role);
        }
        catch (jwtError) {
            const errorMessage = jwtError instanceof Error ? jwtError.message : String(jwtError);
            console.log('❌ Token verification failed:', errorMessage);
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
                res.status(401).json({ error: 'Token expired' });
                return;
            }
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        if (!decoded.id || !decoded.phone || !decoded.role) {
            res.status(401).json({ error: 'Invalid token payload' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                isApproved: true,
                parentTeacherId: true,
            },
        });
        if (!user) {
            res.status(401).json({ error: 'User no longer exists' });
            return;
        }
        req.user = {
            id: user.id,
            phone: user.phone,
            role: user.role,
            status: user.status,
            isApproved: user.isApproved,
            parentTeacherId: user.parentTeacherId,
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        let rawOptToken = authHeader.split(' ')[1] ?? '';
        if (rawOptToken.toLowerCase().startsWith('bearer ')) {
            rawOptToken = rawOptToken.substring(7);
        }
        const token = rawOptToken.replace(/['"]+/g, '').trim();
        if (!token || token.trim() === '') {
            next();
            return;
        }
        // Check if token is blacklisted
        if ((0, logout_controller_1.isBlacklisted)(token)) {
            next();
            return;
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch {
            next();
            return;
        }
        if (!decoded.id) {
            next();
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                phone: true,
                role: true,
                status: true,
                isApproved: true,
                parentTeacherId: true,
            },
        });
        if (user && user.isApproved) {
            req.user = {
                id: user.id,
                phone: user.phone,
                role: user.role,
                status: user.status,
                isApproved: user.isApproved,
                parentTeacherId: user.parentTeacherId,
            };
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
// Middleware specifically built for Teacher Approval Workflow
const isApprovedUser = (req, res, next) => {
    if (req.user && (!req.user.isApproved || req.user.status?.toLowerCase() !== 'approved')) {
        res.status(403).json({ error: 'Account pending approval' });
        return;
    }
    next();
};
exports.isApprovedUser = isApprovedUser;
//# sourceMappingURL=auth.middleware.js.map