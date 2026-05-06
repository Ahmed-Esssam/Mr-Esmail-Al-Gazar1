"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lessonUploadFields = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 1. Storage Directories Strategy
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
const VIDEOS_DIR = path_1.default.join(UPLOAD_DIR, 'videos');
const THUMBNAILS_DIR = path_1.default.join(UPLOAD_DIR, 'thumbnails');
const PDFS_DIR = path_1.default.join(UPLOAD_DIR, 'pdfs');
// Auto-create directories if they don't exist
[UPLOAD_DIR, VIDEOS_DIR, THUMBNAILS_DIR, PDFS_DIR].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// 2. Storage Engine (Categorized)
const storage = multer_1.default.diskStorage({
    destination: (_req, file, cb) => {
        switch (file.fieldname) {
            case 'videoFile':
                cb(null, VIDEOS_DIR);
                break;
            case 'thumbnailFile':
                cb(null, THUMBNAILS_DIR);
                break;
            case 'pdfFile':
                cb(null, PDFS_DIR);
                break;
            default:
                cb(null, UPLOAD_DIR);
        }
    },
    filename: (_req, file, cb) => {
        // Unique naming convention to prevent overrides
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = path_1.default.extname(file.originalname);
        if (!ext) {
            if (file.fieldname === 'videoFile' || file.mimetype.startsWith('video/'))
                ext = '.mp4';
            else if (file.fieldname === 'thumbnailFile' || file.mimetype.startsWith('image/'))
                ext = '.jpg';
            else if (file.fieldname === 'pdfFile')
                ext = '.pdf';
        }
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
});
// 3. Strict File Filtering
const fileFilter = (_req, file, cb) => {
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedPdfTypes = ['application/pdf'];
    if (file.fieldname === 'videoFile') {
        if (allowedVideoTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid video format. Allowed: mp4, webm, quicktime'));
        }
    }
    else if (file.fieldname === 'thumbnailFile') {
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid image format. Allowed: jpeg, png, webp, gif'));
        }
    }
    else if (file.fieldname === 'pdfFile') {
        if (allowedPdfTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid document format. Allowed: pdf'));
        }
    }
    else {
        cb(null, true);
    }
};
// 4. Exported Middleware
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max per file
        files: 10,
    },
});
// Helper fields exporter for specific routes
exports.lessonUploadFields = exports.uploadMiddleware.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
]);
//# sourceMappingURL=upload.middleware.js.map