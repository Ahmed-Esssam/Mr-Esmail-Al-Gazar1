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
const store_controller_1 = require("../controllers/store.controller");
const router = (0, express_1.Router)();
// ── Multer for receipt images ──────────────────────────────────────────────
const receiptStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path_1.default.join(process.cwd(), 'uploads', 'receipts');
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        cb(null, `receipt-${suffix}${ext}`);
    },
});
const uploadReceipt = (0, multer_1.default)({
    storage: receiptStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max for receipt images
});
// ── Routes ────────────────────────────────────────────────────────────────────
// GET /api/store/courses — public catalog (optionally auth to mark isOwned)
router.get('/courses', auth_middleware_1.optionalAuthMiddleware, store_controller_1.getStoreCourses);
// GET /api/store/courses/:id — single course details with lessons
router.get('/courses/:id', auth_middleware_1.optionalAuthMiddleware, store_controller_1.getStoreCourseById);
// GET /api/store/my-courses — student's APPROVED purchases only (fixes data-leak)
router.get('/my-courses', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('STUDENT'), store_controller_1.getMyPurchasedCourses);
// POST /api/store/checkout — submit manual payment receipt
router.post('/checkout', auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)('STUDENT'), uploadReceipt.single('receipt'), store_controller_1.submitCheckout);
exports.default = router;
//# sourceMappingURL=store.routes.js.map