"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadThumbnail = exports.deleteCourse = exports.updateCourse = exports.getCourseById = exports.createCourse = exports.getAllCourses = exports.getTeacherCourses = void 0;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/my  — returns all courses owned by the logged-in teacher
// ─────────────────────────────────────────────────────────────────────────────
const getTeacherCourses = async (req, res) => {
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
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { lessons: true } },
            },
        });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const formatUrl = (url) => {
            if (!url)
                return null;
            if (url.startsWith('http'))
                return url;
            const normalized = url.replace(/\\/g, '/').replace(/\/+/g, '/');
            if (normalized.startsWith('/uploads/')) {
                return `${baseUrl}${normalized}`;
            }
            return `${baseUrl}/uploads/${normalized}`;
        };
        const result = courses.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            price: c.price,
            subject: c.subject,
            thumbnailUrl: formatUrl(c.thumbnailUrl),
            lessonCount: c._count.lessons,
            createdAt: c.createdAt,
        }));
        res.json(result);
    }
    catch (error) {
        console.error('getTeacherCourses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTeacherCourses = getTeacherCourses;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses  — returns ALL courses (Admin) or teacher's own (Teacher)
// ─────────────────────────────────────────────────────────────────────────────
const getAllCourses = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const whereClause = authUser.role === 'SUPER_ADMIN'
            ? {}
            : { teacherId: ownerId };
        const courses = await prisma.course.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                teacher: { select: { id: true, name: true } },
                _count: { select: { lessons: true } },
            },
        });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const formatUrl = (url) => {
            if (!url)
                return null;
            if (url.startsWith('http'))
                return url;
            const normalized = url.replace(/\\/g, '/');
            return `${baseUrl}/uploads/${normalized}`;
        };
        const result = courses.map((c) => ({
            id: c.id,
            title: c.title,
            price: c.price,
            thumbnailUrl: formatUrl(c.thumbnailUrl),
            teacherName: c.teacher.name,
            lessonCount: c._count.lessons,
            createdAt: c.createdAt,
        }));
        res.json(result);
    }
    catch (error) {
        console.error('getAllCourses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllCourses = getAllCourses;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses  — create a new course (multipart: title, price, thumbnail)
// ─────────────────────────────────────────────────────────────────────────────
const createCourse = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        const { title, description, price, subject, grade } = req.body;
        if (!title || title.trim() === '') {
            res.status(400).json({ error: 'Course title is required' });
            return;
        }
        // DEBUG: Log what's being received
        console.log('🔥 DEBUG createCourse body:', req.body);
        const parsedPrice = price ? parseFloat(price) : 0;
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            res.status(400).json({ error: 'Price must be a non-negative number' });
            return;
        }
        // Thumbnail is optional — multer puts single file in req.file
        const files = req.files;
        const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
        let thumbnailUrl;
        if (files?.thumbnail?.[0]) {
            thumbnailUrl = files.thumbnail[0].path.replace(UPLOADS_DIR, '').replace(/^[/\\]/, '');
        }
        const course = await prisma.course.create({
            data: {
                teacherId: ownerId,
                title: title.trim(),
                description: description?.trim() ?? null,
                subject: subject?.trim() ?? null,
                grade: grade?.trim() ?? null,
                price: parsedPrice,
                thumbnailUrl: thumbnailUrl ?? null,
            },
        });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.status(201).json({
            message: 'Course created successfully',
            course: {
                id: course.id,
                title: course.title,
                price: course.price,
                thumbnailUrl: thumbnailUrl ? `${baseUrl}/uploads/${thumbnailUrl}` : null,
                createdAt: course.createdAt,
            },
        });
    }
    catch (error) {
        console.error('createCourse error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createCourse = createCourse;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/:id  — fetch a single course (public)
// ─────────────────────────────────────────────────────────────────────────────
const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                lessons: {
                    include: { quizzes: true },
                    orderBy: { createdAt: 'asc' },
                },
                teacher: { select: { id: true, name: true } },
            },
        });
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fmt = (url) => {
            if (!url)
                return null;
            if (url.startsWith('http'))
                return url;
            return `${baseUrl}/uploads/${url}`;
        };
        res.json({
            id: course.id,
            title: course.title,
            price: course.price,
            description: course.description ?? null,
            subject: course.subject ?? null,
            thumbnailUrl: fmt(course.thumbnailUrl),
            teacher: course.teacher,
            lessons: course.lessons.map((l) => {
                const firstQuiz = l.quizzes && l.quizzes.length > 0 ? l.quizzes[0] : null;
                // Parse the questions JSON string to get the actual questions array and timeLimit
                let parsedQuizData = null;
                if (firstQuiz?.questions != null) {
                    try {
                        parsedQuizData = JSON.parse(firstQuiz.questions);
                    }
                    catch (e) {
                        console.error('Failed to parse quiz questions:', e);
                    }
                }
                return {
                    id: l.id,
                    title: l.title,
                    thumbnailUrl: fmt(l.thumbnailUrl),
                    videoUrl: l.videoUrl ? fmt(l.videoUrl) : null,
                    subjectId: l.subjectId,
                    createdAt: l.createdAt,
                    homeworkPdfUrl: l.homeworkPdfUrl,
                    homeworkText: l.homeworkText,
                    hasQuiz: firstQuiz !== null,
                    quizId: firstQuiz?.id ?? null,
                    quiz: firstQuiz ? {
                        id: firstQuiz.id,
                        title: parsedQuizData != null ? (parsedQuizData['title'] || 'Untitled Quiz') : 'Untitled Quiz',
                        questions: parsedQuizData != null && parsedQuizData['questions'] != null
                            ? parsedQuizData['questions']
                            : [],
                        timeLimitMinutes: parsedQuizData != null && parsedQuizData['timeLimit'] != null
                            ? parsedQuizData['timeLimit']
                            : 30,
                    } : null,
                };
            }),
        });
    }
    catch (error) {
        console.error('getCourseById error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCourseById = getCourseById;
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/courses/:id  — update course title/description (teacher owner only)
// ─────────────────────────────────────────────────────────────────────────────
const updateCourse = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const { title, description, price, subject, thumbnailUrl } = req.body;
        const course = await prisma.course.findFirst({
            where: { id },
        });
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        if (course.teacherId !== ownerId && authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title.trim();
        if (description !== undefined)
            updateData.description = description.trim();
        if (price !== undefined) {
            const parsed = parseFloat(price);
            if (!isNaN(parsed) && parsed >= 0)
                updateData.price = parsed;
        }
        if (subject !== undefined)
            updateData.subject = subject.trim();
        if (thumbnailUrl !== undefined)
            updateData.thumbnailUrl = thumbnailUrl.trim();
        const updated = await prisma.course.update({
            where: { id },
            data: updateData,
        });
        console.log('Course updated:', { id: updated.id, title: updated.title, by: authUser.id });
        res.json({ message: 'Course updated', course: updated });
    }
    catch (error) {
        console.error('updateCourse error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateCourse = updateCourse;
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/courses/:id  — cascade delete (teacher owner only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteCourse = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const course = await prisma.course.findFirst({
            where: { id },
        });
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        if (course.teacherId !== ownerId && authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        await prisma.$transaction(async (tx) => {
            await tx.tracking.deleteMany({ where: { lesson: { courseId: id } } });
            await tx.quiz.deleteMany({ where: { lesson: { courseId: id } } });
            await tx.lesson.deleteMany({ where: { courseId: id } });
            await tx.courseEnrollment.deleteMany({ where: { courseId: id } });
            await tx.course.delete({ where: { id } });
        });
        console.log('Course DELETED (cascade):', { id, title: course.title, by: authUser.id });
        res.json({ message: 'Course deleted successfully' });
    }
    catch (error) {
        console.error('deleteCourse error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteCourse = deleteCourse;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses/:id/thumbnail  — upload/update course thumbnail
// ─────────────────────────────────────────────────────────────────────────────
const uploadThumbnail = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No thumbnail file provided' });
            return;
        }
        const course = await prisma.course.findFirst({ where: { id } });
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        const ownerId = authUser.role === 'ASSISTANT' && authUser.parentTeacherId
            ? authUser.parentTeacherId
            : authUser.id;
        if (course.teacherId !== ownerId && authUser.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
        const relativePath = file.path.replace(UPLOADS_DIR, '').replace(/^[/\\]/, '');
        const updated = await prisma.course.update({
            where: { id },
            data: { thumbnailUrl: relativePath },
        });
        console.log('Thumbnail uploaded:', { courseId: id, relativePath, by: authUser.id });
        res.json({ message: 'Thumbnail updated', thumbnailUrl: `/uploads/${relativePath}`, courseId: updated.id });
    }
    catch (error) {
        console.error('uploadThumbnail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.uploadThumbnail = uploadThumbnail;
//# sourceMappingURL=course.controller.js.map