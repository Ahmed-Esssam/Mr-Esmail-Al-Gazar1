"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const course_controller_1 = require("../controllers/course.controller");
const router = (0, express_1.Router)();
// ── Multer — stores course thumbnails in organized subdirectory ──────────────
const COURSE_THUMBNAILS_DIR = path_1.default.join(process.cwd(), 'uploads', 'thumbnails', 'course-thumbnails');
if (!fs_1.default.existsSync(COURSE_THUMBNAILS_DIR)) {
    fs_1.default.mkdirSync(COURSE_THUMBNAILS_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, COURSE_THUMBNAILS_DIR);
    },
    filename: (_req, file, cb) => {
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        cb(null, `course-thumb-${suffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max for thumbnails
});
// ── Routes ───────────────────────────────────────────────────────────────────
// GET /api/courses  — returns ALL courses (Admin) or teacher's own courses (Teacher)
router.get('/', auth_middleware_1.authMiddleware, course_controller_1.getAllCourses);
// GET /api/courses/my  — teacher's own courses (used by the lesson dropdown)
router.get('/my', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('TEACHER', 'SUPER_ADMIN'), course_controller_1.getTeacherCourses);
// POST /api/courses  — create a new course (requires SUPER_ADMIN or APPROVED_TEACHER)
router.post('/', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, upload.fields([{ name: 'thumbnail', maxCount: 1 }]), course_controller_1.createCourse);
// GET /api/courses/:id  — public single-course view
router.get('/:id', course_controller_1.getCourseById);
// PUT /api/courses/:id  — update course (owner or admin)
router.put('/:id', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, course_controller_1.updateCourse);
// PATCH /api/courses/:id  — update course (owner or admin) - matches frontend
router.patch('/:id', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, course_controller_1.updateCourse);
// DELETE /api/courses/:id  — cascade delete course (owner or admin)
router.delete('/:id', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, course_controller_1.deleteCourse);
// POST /api/courses/:id/thumbnail  — upload course thumbnail
const thumbnailStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, COURSE_THUMBNAILS_DIR);
    },
    filename: (_req, file, cb) => {
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        cb(null, `course-thumb-${suffix}${ext}`);
    },
});
const thumbnailUpload = (0, multer_1.default)({ storage: thumbnailStorage, limits: { fileSize: 20 * 1024 * 1024 } });
router.post('/:id/thumbnail', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, thumbnailUpload.single('thumbnail'), course_controller_1.uploadThumbnail);
exports.default = router;
//# sourceMappingURL=course.routes.js.map