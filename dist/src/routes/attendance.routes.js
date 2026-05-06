"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionDetails = exports.markAttendance = exports.getSessions = exports.createSession = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const prisma = new client_1.PrismaClient();
const getOwnerId = (authUser) => {
    return authUser.role === 'ASSISTANT' && authUser.parentTeacherId
        ? authUser.parentTeacherId
        : authUser.id;
};
const createSession = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = getOwnerId(authUser);
        const { subject, grade, date } = req.body;
        if (!subject || !grade) {
            res.status(400).json({ error: 'Subject and grade are required' });
            return;
        }
        let sessionDate = new Date();
        if (date) {
            sessionDate = new Date(date);
        }
        const existingSession = await prisma.attendanceSession.findFirst({
            where: {
                ownerId,
                subject,
                grade,
                date: {
                    gte: new Date(sessionDate.setHours(0, 0, 0, 0)),
                    lt: new Date(sessionDate.setHours(23, 59, 59, 999)),
                },
            },
        });
        if (existingSession) {
            res.json({ session: existingSession });
            return;
        }
        const session = await prisma.attendanceSession.create({
            data: {
                subject,
                grade,
                date: sessionDate,
                ownerId,
            },
        });
        res.status(201).json({ session });
    }
    catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createSession = createSession;
const getSessions = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = getOwnerId(authUser);
        const sessions = await prisma.attendanceSession.findMany({
            where: { ownerId },
            orderBy: { date: 'desc' },
            include: {
                _count: { select: { records: true } },
            },
            take: 50,
        });
        const result = sessions.map((s) => ({
            id: s.id,
            subject: s.subject,
            grade: s.grade,
            date: s.date,
            studentCount: s._count.records,
        }));
        res.json(result);
    }
    catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSessions = getSessions;
const markAttendance = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = getOwnerId(authUser);
        const { sessionId, studentId } = req.body;
        if (!sessionId || !studentId) {
            res.status(400).json({ error: 'Session ID and student ID are required' });
            return;
        }
        const session = await prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });
        if (!session || session.ownerId !== ownerId) {
            res.status(404).json({ error: 'Session not found or unauthorized' });
            return;
        }
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { id: true, name: true, role: true },
        });
        if (!student || student.role !== 'STUDENT') {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        const existingRecord = await prisma.attendanceRecord.findUnique({
            where: {
                sessionId_studentId: {
                    sessionId,
                    studentId,
                },
            },
        });
        if (existingRecord) {
            res.json({
                message: 'Attendance already marked',
                student: { id: student.id, name: student.name },
            });
            return;
        }
        const record = await prisma.attendanceRecord.create({
            data: {
                sessionId,
                studentId,
            },
        });
        res.status(201).json({
            message: 'Attendance marked successfully',
            student: { id: student.id, name: student.name },
        });
    }
    catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markAttendance = markAttendance;
const getSessionDetails = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = getOwnerId(authUser);
        const { sessionId } = req.params;
        const session = await prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });
        if (!session || session.ownerId !== ownerId) {
            res.status(404).json({ error: 'Session not found or unauthorized' });
            return;
        }
        const records = await prisma.attendanceRecord.findMany({
            where: { sessionId },
            include: {
                student: { select: { id: true, name: true, phone: true } },
            },
        });
        res.json({
            session: {
                id: session.id,
                subject: session.subject,
                grade: session.grade,
                date: session.date,
            },
            students: records.map((r) => ({
                id: r.student.id,
                name: r.student.name,
                phone: r.student.phone,
                timestamp: r.timestamp,
            })),
        });
    }
    catch (error) {
        console.error('Get session details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSessionDetails = getSessionDetails;
const router = (0, express_1.Router)();
router.post('/sessions', auth_middleware_1.authMiddleware, exports.createSession);
router.get('/sessions', auth_middleware_1.authMiddleware, exports.getSessions);
router.get('/sessions/:sessionId', auth_middleware_1.authMiddleware, exports.getSessionDetails);
router.post('/mark', auth_middleware_1.authMiddleware, exports.markAttendance);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map