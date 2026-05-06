"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const logout_controller_1 = require("../controllers/logout.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
router.post('/register', auth_controller_1.register);
router.post('/logout', auth_middleware_1.authMiddleware, logout_controller_1.logout);
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.getMe);
router.put('/profile', auth_middleware_1.authMiddleware, auth_controller_1.editProfile);
router.post('/change-password', auth_middleware_1.authMiddleware, auth_controller_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map