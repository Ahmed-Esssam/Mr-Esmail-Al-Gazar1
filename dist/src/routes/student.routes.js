"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.get('/my-dashboard', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('STUDENT'), student_controller_1.getStudentDashboard);
router.get('/weekly-progress', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('STUDENT'), student_controller_1.getWeeklyProgress);
router.get('/recent-lessons', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('STUDENT'), student_controller_1.getRecentLessons);
exports.default = router;
//# sourceMappingURL=student.routes.js.map