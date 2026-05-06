"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const seedAdmin_1 = require("./utils/seedAdmin");
const socket_1 = require("./socket");
const node_cron_1 = __importDefault(require("node-cron"));
const cleanup_1 = require("./utils/cleanup");
const express_1 = __importStar(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const store_routes_1 = __importDefault(require("./routes/store.routes"));
const lesson_routes_1 = __importDefault(require("./routes/lesson.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const tracking_routes_1 = __importDefault(require("./routes/tracking.routes"));
const course_routes_1 = __importDefault(require("./routes/course.routes"));
const teacher_routes_1 = __importDefault(require("./routes/teacher.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const parent_routes_1 = __importDefault(require("./routes/parent.routes"));
const progress_routes_1 = __importDefault(require("./routes/progress.routes"));
const whatsapp_routes_1 = __importDefault(require("./routes/whatsapp.routes"));
const admin_controller_1 = require("./controllers/admin.controller");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
// ============================================================
// MIDDLEWARE ORDER: CORS FIRST, THEN BODY PARSERS, THEN STATIC
// ============================================================
// 1. CORS MUST BE THE VERY FIRST MIDDLEWARE
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));
// 2. BODY PARSERS (before routes) - increased for large file uploads
app.use(express_1.default.json({ limit: '2gb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '2gb' }));
// 3. STATIC FILES - Serve uploads directory with proper CORS headers
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
app.use('/uploads', express_1.default.static(uploadsDir, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg')
            res.setHeader('Content-Type', 'image/jpeg');
        else if (ext === '.png')
            res.setHeader('Content-Type', 'image/png');
        else if (ext === '.pdf')
            res.setHeader('Content-Type', 'application/pdf');
        // Add CORS headers for static files
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    },
}));
// Check if uploads directory exists
if (fs_1.default.existsSync(uploadsDir)) {
    console.log('✅ Uploads directory found at:', uploadsDir);
    const files = fs_1.default.readdirSync(uploadsDir);
    if (files.length > 0) {
        console.log('✅ Files in uploads:', files.slice(0, 5).join(', ') + (files.length > 5 ? '...' : ''));
    }
    else {
        console.log('📁 Uploads directory is empty');
    }
}
else {
    console.log('⚠️ WARNING: Uploads directory not found at:', uploadsDir);
    // Create it
    try {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Created uploads directory at:', uploadsDir);
    }
    catch (e) {
        console.error('❌ Failed to create uploads directory:', e);
    }
}
// Handle preflight OPTIONS
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
});
// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', auth_routes_1.default);
app.use('/api/auth', whatsapp_routes_1.default); // WhatsApp OTP routes
app.use('/api/admin/users', admin_routes_1.default);
// Subjects route (no auth required for Flutter app)
const subjectRoutes = (0, express_1.Router)();
subjectRoutes.get('/', admin_controller_1.getSubjects);
app.use('/api/subjects', subjectRoutes);
app.use('/api/parents', parent_routes_1.default);
app.use('/api/student', student_routes_1.default);
app.use('/api/store', store_routes_1.default);
app.use('/api/lessons', lesson_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/lessons/upload', upload_routes_1.default);
app.use('/api/trackings', tracking_routes_1.default);
app.use('/api/courses', course_routes_1.default);
app.use('/api/teachers', teacher_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/progress', progress_routes_1.default);
// Quiz routes (for pending essays)
app.use('/api/quiz', tracking_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', environment: NODE_ENV });
});
// Schedule daily cleanup at 3:00 AM
node_cron_1.default.schedule('0 3 * * *', async () => {
    console.log('⏰ Running scheduled daily orphaned files cleanup...');
    try {
        await (0, cleanup_1.cleanupOrphanedFiles)();
    }
    catch (error) {
        console.error('Daily cleanup failed:', error);
    }
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server running: ${NODE_ENV} | Port: ${PORT}`);
    console.log(`📚 API: http://localhost:${PORT}/api`);
    console.log(`📁 Static files: http://localhost:${PORT}/uploads`);
    await (0, seedAdmin_1.seedSuperAdmin)();
});
(0, socket_1.initSocket)(server);
server.timeout = 300000;
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
exports.default = app;
//# sourceMappingURL=server.js.map