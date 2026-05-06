"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lesson_controller_1 = require("../controllers/lesson.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.post('/mark-attendance', auth_middleware_1.authMiddleware, lesson_controller_1.markAttendance);
router.post('/submit-quiz', auth_middleware_1.authMiddleware, lesson_controller_1.submitQuiz);
router.get('/fetch-students', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('TEACHER', 'SUPER_ADMIN'), lesson_controller_1.fetchStudents);
router.get('/', lesson_controller_1.getLessons);
router.get('/public', lesson_controller_1.getLessons);
router.get('/:id', auth_middleware_1.authMiddleware, lesson_controller_1.getLessonById);
router.post('/', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, lesson_controller_1.createLesson);
router.put('/:id', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, lesson_controller_1.updateLesson);
router.delete('/:id', auth_middleware_1.authMiddleware, role_middleware_1.canManageContent, lesson_controller_1.deleteLesson);
exports.default = router;
//# sourceMappingURL=lesson.routes.js.map