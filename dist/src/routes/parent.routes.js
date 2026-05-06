"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parent_controller_1 = require("../controllers/parent.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/my-children', auth_middleware_1.authMiddleware, parent_controller_1.getMyChildren);
router.get('/child/:studentId/stats', auth_middleware_1.authMiddleware, parent_controller_1.getChildStats);
exports.default = router;
//# sourceMappingURL=parent.routes.js.map