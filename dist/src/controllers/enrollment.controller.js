"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectPayment = exports.getPaymentHistory = exports.approvePayment = exports.getPendingPayments = exports.updateEnrollmentStatus = exports.getTeacherEnrollments = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const formatUrl = (baseUrl, url) => {
    if (!url)
        return null;
    if (url.startsWith('http'))
        return url;
    return `${baseUrl}/uploads/${url}`;
};
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teachers/enrollments
// Returns enrollments for the teacher's courses, filtered by status.
// ─────────────────────────────────────────────────────────────────────────────
const getTeacherEnrollments = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { status } = req.query;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        // Get ownerId: ASSISTANT acts on behalf of parentTeacherId
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const enrollments = await prisma.courseEnrollment.findMany({
            where: {
                ...(status ? { status: status.toUpperCase() } : {}),
                course: {
                    teacherId: ownerId,
                },
            },
            include: {
                student: {
                    select: { name: true, phone: true },
                },
                course: {
                    select: { title: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const result = enrollments.map((e) => ({
            id: e.id,
            studentName: e.student.name,
            studentPhone: e.student.phone,
            courseTitle: e.course.title,
            paymentMethod: e.paymentMethod,
            receiptImageUrl: formatUrl(baseUrl, e.receiptImageUrl),
            status: e.status,
            createdAt: e.createdAt,
        }));
        res.json(result);
    }
    catch (error) {
        console.error('getTeacherEnrollments error:', error);
        res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
};
exports.getTeacherEnrollments = getTeacherEnrollments;
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/teachers/enrollments/:id
// Updates the status of an enrollment (e.g., from PENDING to APPROVED or REJECTED)
// ─────────────────────────────────────────────────────────────────────────────
const updateEnrollmentStatus = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        // Verify ownership
        const enrollment = await prisma.courseEnrollment.findUnique({
            where: { id },
            include: { course: true },
        });
        if (!enrollment) {
            res.status(404).json({ error: 'Enrollment not found' });
            return;
        }
        if (enrollment.course.teacherId !== ownerId) {
            res.status(403).json({ error: 'Forbidden: You do not own this course' });
            return;
        }
        const updated = await prisma.courseEnrollment.update({
            where: { id },
            data: { status: status.toUpperCase() },
        });
        res.json({
            message: `Enrollment status updated to ${updated.status}`,
            enrollment: updated,
        });
    }
    catch (error) {
        console.error('updateEnrollmentStatus error:', error);
        res.status(500).json({ error: 'Failed to update enrollment status' });
    }
};
exports.updateEnrollmentStatus = updateEnrollmentStatus;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teachers/payments/pending
// ─────────────────────────────────────────────────────────────────────────────
const getPendingPayments = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const enrollments = await prisma.courseEnrollment.findMany({
            where: {
                status: 'PENDING',
                course: { teacherId: ownerId },
            },
            include: {
                student: { select: { name: true, phone: true } },
                course: { select: { title: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const result = enrollments.map((e) => ({
            id: e.id,
            studentName: e.student.name,
            studentPhone: e.student.phone,
            courseTitle: e.course.title,
            paymentMethod: e.paymentMethod,
            receiptImageUrl: formatUrl(baseUrl, e.receiptImageUrl),
            createdAt: e.createdAt,
        }));
        console.log('Pending payments:', { count: result.length, ownerId });
        res.json(result);
    }
    catch (error) {
        console.error('getPendingPayments error:', error);
        res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
};
exports.getPendingPayments = getPendingPayments;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teachers/payments/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
const approvePayment = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const enrollment = await prisma.courseEnrollment.findUnique({
            where: { id },
            include: { course: true },
        });
        if (!enrollment) {
            res.status(404).json({ error: 'Enrollment not found' });
            return;
        }
        if (enrollment.course.teacherId !== ownerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (enrollment.status !== 'PENDING') {
            res.status(400).json({ error: 'Enrollment is not pending' });
            return;
        }
        const updated = await prisma.courseEnrollment.update({
            where: { id },
            data: { status: 'APPROVED' },
        });
        console.log('Payment APPROVED:', { id, student: enrollment.studentId, course: enrollment.courseId, by: authUser.id });
        res.json({ message: 'Payment approved successfully', enrollment: updated });
    }
    catch (error) {
        console.error('approvePayment error:', error);
        res.status(500).json({ error: 'Failed to approve payment' });
    }
};
exports.approvePayment = approvePayment;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teachers/payments/history
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentHistory = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const enrollments = await prisma.courseEnrollment.findMany({
            where: {
                status: { in: ['APPROVED', 'REJECTED'] },
                course: { teacherId: ownerId },
            },
            include: {
                student: { select: { name: true, phone: true } },
                course: { select: { title: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        const result = enrollments.map((e) => ({
            id: e.id,
            studentName: e.student.name,
            studentPhone: e.student.phone,
            courseTitle: e.course.title,
            paymentMethod: e.paymentMethod,
            receiptImageUrl: formatUrl(baseUrl, e.receiptImageUrl),
            status: e.status,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
        }));
        console.log('Payment history:', { count: result.length, ownerId });
        res.json(result);
    }
    catch (error) {
        console.error('getPaymentHistory error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
};
exports.getPaymentHistory = getPaymentHistory;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teachers/payments/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
const rejectPayment = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const enrollment = await prisma.courseEnrollment.findUnique({
            where: { id },
            include: { course: true },
        });
        if (!enrollment) {
            res.status(404).json({ error: 'Enrollment not found' });
            return;
        }
        if (enrollment.course.teacherId !== ownerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const updated = await prisma.courseEnrollment.update({
            where: { id },
            data: { status: 'REJECTED' },
        });
        console.log('Payment REJECTED:', { id, by: authUser.id });
        res.json({ message: 'Payment rejected', enrollment: updated });
    }
    catch (error) {
        console.error('rejectPayment error:', error);
        res.status(500).json({ error: 'Failed to reject payment' });
    }
};
exports.rejectPayment = rejectPayment;
//# sourceMappingURL=enrollment.controller.js.map