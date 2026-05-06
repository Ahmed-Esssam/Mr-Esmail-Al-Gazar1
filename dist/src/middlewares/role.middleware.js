"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTeacherApproval = exports.canManageContent = exports.roleMiddleware = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ─── Generic role gate ────────────────────────────────────────────────────────
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!allowedRoles.includes(authUser.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
// ─── Content management gate (synchronous, for non-upload routes) ─────────────
const canManageContent = (req, res, next) => {
    const authUser = req.user;
    if (!authUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const isSuperAdmin = authUser.role === 'SUPER_ADMIN';
    const isApprovedTeacher = authUser.role === 'TEACHER' && authUser.status?.toLowerCase() === 'approved';
    if (!isSuperAdmin && !isApprovedTeacher) {
        res.status(403).json({
            error: 'Forbidden: Content management requires Super Admin or Approved Teacher status',
            code: 'INSUFFICIENT_PERMISSIONS',
        });
        return;
    }
    next();
};
exports.canManageContent = canManageContent;
// ─── Dedicated upload gate ────────────────────────────────────────────────────
// MUST run BEFORE multer so no file is ever written to disk for an unauthorized
// request. Does a fresh real-time DB query — never trusts the JWT payload.
// Normalizes status to UPPERCASE for bulletproof case-insensitive comparison.
const checkTeacherApproval = async (req, res, next) => {
    try {
        // Resolve userId from whichever field authMiddleware populated
        const userId = req.user?.id
            || req.user?._id
            || req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Invalid token payload: user ID missing' });
            return;
        }
        const dbUser = await prisma.user.findUnique({
            where: { id: String(userId) },
            select: {
                id: true,
                phone: true,
                role: true,
                status: true,
                isApproved: true,
                isVerified: true,
            },
        });
        if (!dbUser) {
            res.status(401).json({ error: 'User no longer exists' });
            return;
        }
        // SUPER_ADMIN bypasses all approval gates
        if (dbUser.role === 'SUPER_ADMIN') {
            req.user = {
                id: dbUser.id,
                phone: dbUser.phone,
                role: dbUser.role,
                status: dbUser.status,
                isApproved: dbUser.isApproved,
            };
            next();
            return;
        }
        // Only TEACHER role beyond this point
        if (dbUser.role !== 'TEACHER') {
            res.status(403).json({ error: 'Only teachers and admins can upload lessons' });
            return;
        }
        // Normalize to UPPERCASE — covers 'approved', 'APPROVED', 'Approved' equally
        const normalizedStatus = dbUser.status?.toUpperCase();
        console.log(`🔍 checkTeacherApproval | userId=${dbUser.id} | role=${dbUser.role}` +
            ` | status="${dbUser.status}" | isApproved=${dbUser.isApproved} | isVerified=${dbUser.isVerified}`);
        if (normalizedStatus !== 'APPROVED' || !dbUser.isApproved) {
            res.status(403).json({
                error: 'Your account is not approved. Please contact Super Admin.',
                debug: { status: dbUser.status, isApproved: dbUser.isApproved },
            });
            return;
        }
        // Enrich req.user with fresh live DB data — controller won't need to re-query
        req.user = {
            id: dbUser.id,
            phone: dbUser.phone,
            role: dbUser.role,
            status: dbUser.status,
            isApproved: dbUser.isApproved,
        };
        next();
    }
    catch (error) {
        console.error('checkTeacherApproval error:', error);
        res.status(500).json({ error: 'Server error during approval check' });
    }
};
exports.checkTeacherApproval = checkTeacherApproval;
//# sourceMappingURL=role.middleware.js.map