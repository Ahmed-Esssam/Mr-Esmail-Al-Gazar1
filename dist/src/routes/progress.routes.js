"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progress_controller_1 = require("../controllers/progress.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/update', auth_middleware_1.authMiddleware, progress_controller_1.updateProgress);
exports.default = router;
//# sourceMappingURL=progress.routes.js.map