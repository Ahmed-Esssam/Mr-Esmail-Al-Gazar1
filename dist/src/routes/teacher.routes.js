"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAssistant = exports.getAssistants = exports.createAssistant = exports.getTeacherStats = exports.createTeacher = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const enrollment_controller_1 = require("../controllers/enrollment.controller");
const student_controller_1 = require("../controllers/student.controller");
const prisma = new client_1.PrismaClient();
const createTeacher = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only Super Admin can create teacher accounts' });
            return;
        }
        const { name, phone, password, subjectId } = req.body;
        if (!name || !phone || !password) {
            res.status(400).json({ error: 'Name, phone and password are required' });
            return;
        }
        const sanitizedPhone = phone.trim();
        const existingUser = await prisma.user.findUnique({
            where: { phone: sanitizedPhone },
        });
        if (existingUser) {
            res.status(409).json({ error: 'User with this phone number already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const teacher = await prisma.user.create({
            data: {
                name: name.trim(),
                phone: sanitizedPhone,
                email: sanitizedPhone + '@teacher.local',
                password: hashedPassword,
                role: 'TEACHER',
                status: 'approved',
                isApproved: true,
                isVerified: true,
                ...(subjectId ? { subjectId } : {}),
            },
        });
        res.status(201).json({
            message: 'Teacher account created successfully',
            teacher: {
                id: teacher.id,
                name: teacher.name,
                phone: teacher.phone,
                role: teacher.role,
            },
        });
    }
    catch (error) {
        console.error('Create teacher error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createTeacher = createTeacher;
const getTeacherStats = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const courses = await prisma.course.findMany({
            where: { teacherId: ownerId },
            select: { id: true },
        });
        const courseIds = courses.map(c => c.id);
        const courseEnrollments = await prisma.courseEnrollment.findMany({
            where: { courseId: { in: courseIds } },
            select: { studentId: true },
        });
        const uniqueStudentIds = new Set();
        courseEnrollments.forEach(e => uniqueStudentIds.add(e.studentId));
        const lessons = await prisma.lesson.findMany({
            where: { teacherId: ownerId },
            include: { trackings: true },
        });
        const uniqueLessonStudents = new Set();
        lessons.forEach(l => l.trackings.forEach(t => uniqueLessonStudents.add(t.studentId)));
        const totalPresent = lessons.reduce((sum, l) => sum + l.trackings.filter(t => t.isPresent).length, 0);
        const totalExpected = lessons.length > 0 && uniqueLessonStudents.size > 0
            ? lessons.length * uniqueLessonStudents.size
            : 0;
        const attendancePercent = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
        const trackingsWithScore = lessons.flatMap(l => l.trackings).filter(t => t.quizScore !== null && t.quizScore > 0);
        const avgScore = trackingsWithScore.length > 0
            ? Math.round(trackingsWithScore.reduce((sum, t) => sum + (t.quizScore || 0), 0) / trackingsWithScore.length)
            : 0;
        const approvedEnrollments = await prisma.courseEnrollment.count({
            where: { courseId: { in: courseIds }, status: 'APPROVED' },
        });
        res.json({
            attendancePercent,
            avgScore,
            homeworkCompletion: trackingsWithScore.length,
            totalStudents: uniqueLessonStudents.size,
            totalLessons: courses.length,
            approvedEnrollments,
        });
        console.log('Teacher Stats:', {
            totalStudents: uniqueLessonStudents.size,
            totalLessons: courses.length,
            approvedEnrollments,
            ownerId,
        });
    }
    catch (error) {
        console.error('Get teacher stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
exports.getTeacherStats = getTeacherStats;
const createAssistant = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (authUser.role !== 'TEACHER' && authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only teachers can create assistants' });
            return;
        }
        const { phone } = req.body;
        if (!phone || phone.trim() === '') {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }
        const existingUser = await prisma.user.findUnique({
            where: { phone: phone.trim() },
        });
        if (existingUser) {
            res.status(409).json({ error: 'User with this phone number already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(phone.trim(), 10);
        const assistant = await prisma.user.create({
            data: {
                name: 'مساعد',
                phone: phone.trim(),
                email: phone.trim() + '@assistant.local',
                password: hashedPassword,
                role: 'ASSISTANT',
                status: 'approved',
                isApproved: true,
                isVerified: true,
                parentTeacherId: authUser.id,
            },
        });
        res.status(201).json({
            message: 'Assistant created successfully',
            assistant: {
                id: assistant.id,
                name: assistant.name,
                phone: assistant.phone,
                role: assistant.role,
            },
        });
    }
    catch (error) {
        console.error('Create assistant error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createAssistant = createAssistant;
const getAssistants = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (authUser.role !== 'TEACHER' && authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only teachers can view assistants' });
            return;
        }
        const assistants = await prisma.user.findMany({
            where: { parentTeacherId: authUser.id, role: 'ASSISTANT' },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true,
                isApproved: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(assistants);
    }
    catch (error) {
        console.error('Get assistants error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAssistants = getAssistants;
const deleteAssistant = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (authUser.role !== 'TEACHER' && authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only teachers can delete assistants' });
            return;
        }
        const { id } = req.params;
        const assistant = await prisma.user.findFirst({
            where: { id, parentTeacherId: authUser.id, role: 'ASSISTANT' },
        });
        if (!assistant) {
            res.status(404).json({ error: 'Assistant not found' });
            return;
        }
        await prisma.user.delete({ where: { id } });
        console.log('Assistant deleted:', { id, name: assistant.name, by: authUser.id });
        res.json({ message: 'Assistant deleted successfully' });
    }
    catch (error) {
        console.error('Delete assistant error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteAssistant = deleteAssistant;
const router = (0, express_1.Router)();
// Teacher account creation (Super Admin only)
router.post('/teachers', auth_middleware_1.authMiddleware, exports.createTeacher);
// Stats
router.get('/stats', auth_middleware_1.authMiddleware, exports.getTeacherStats);
// Assistant management
router.post('/assistants', auth_middleware_1.authMiddleware, exports.createAssistant);
router.get('/assistants', auth_middleware_1.authMiddleware, exports.getAssistants);
router.delete('/assistants/:id', auth_middleware_1.authMiddleware, exports.deleteAssistant);
// Enrollments (Payment Approvals)
router.get('/enrollments', auth_middleware_1.authMiddleware, enrollment_controller_1.getTeacherEnrollments);
router.put('/enrollments/:id', auth_middleware_1.authMiddleware, enrollment_controller_1.updateEnrollmentStatus);
// Payment approvals
router.get('/payments/pending', auth_middleware_1.authMiddleware, enrollment_controller_1.getPendingPayments);
router.get('/payments/history', auth_middleware_1.authMiddleware, enrollment_controller_1.getPaymentHistory);
router.post('/payments/:id/approve', auth_middleware_1.authMiddleware, enrollment_controller_1.approvePayment);
router.post('/payments/:id/reject', auth_middleware_1.authMiddleware, enrollment_controller_1.rejectPayment);
// Student management
router.get('/students', auth_middleware_1.authMiddleware, student_controller_1.getTeacherStudents);
router.post('/students/:studentId/courses/:courseId/remove', auth_middleware_1.authMiddleware, student_controller_1.removeStudentEnrollment);
// Homework Correction - 3-Level Hierarchy
router.get('/courses', auth_middleware_1.authMiddleware, student_controller_1.getTeacherCoursesForGrading);
router.get('/courses/:courseId/assignments', auth_middleware_1.authMiddleware, student_controller_1.getCourseAssignments);
router.get('/courses/:courseId/quizzes', auth_middleware_1.authMiddleware, student_controller_1.getCourseQuizzes);
router.get('/assignments/:assignmentId/submissions', auth_middleware_1.authMiddleware, student_controller_1.getAssignmentSubmissions);
router.post('/assignments/:assignmentId/status', auth_middleware_1.authMiddleware, student_controller_1.updateSubmissionStatus);
exports.default = router;
//# sourceMappingURL=teacher.routes.js.map