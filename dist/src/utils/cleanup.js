"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOrphanedFiles = cleanupOrphanedFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
async function cleanupOrphanedFiles() {
    console.log('🧹 Starting orphaned files cleanup...');
    if (!fs_1.default.existsSync(UPLOADS_DIR)) {
        console.log('📁 No uploads directory found');
        return;
    }
    // Get all video and thumbnail URLs from database
    const lessons = await prisma.lesson.findMany({
        select: { videoUrl: true, thumbnailUrl: true, homeworkPdfUrl: true },
    });
    const courses = await prisma.course.findMany({
        select: { thumbnailUrl: true },
    });
    // Collect all used file paths - use basename for matching
    const validFilesSet = new Set();
    for (const lesson of lessons) {
        if (lesson.videoUrl)
            validFilesSet.add(path_1.default.basename(lesson.videoUrl));
        if (lesson.thumbnailUrl)
            validFilesSet.add(path_1.default.basename(lesson.thumbnailUrl));
        if (lesson.homeworkPdfUrl)
            validFilesSet.add(path_1.default.basename(lesson.homeworkPdfUrl));
    }
    for (const course of courses) {
        if (course.thumbnailUrl)
            validFilesSet.add(path_1.default.basename(course.thumbnailUrl));
    }
    console.log(`📊 Found ${validFilesSet.size} files referenced in database`);
    // Check uploads directory for orphaned files
    const subdirs = ['videos', 'thumbnails', 'pdfs', '', 'temp'];
    let deletedCount = 0;
    for (const subdir of subdirs) {
        const dir = subdir ? path_1.default.join(UPLOADS_DIR, subdir) : UPLOADS_DIR;
        if (!fs_1.default.existsSync(dir))
            continue;
        const files = fs_1.default.readdirSync(dir);
        for (const file of files) {
            const fullPath = path_1.default.join(dir, file);
            try {
                if (!fs_1.default.statSync(fullPath).isFile())
                    continue;
                const fileName = path_1.default.basename(fullPath);
                if (!validFilesSet.has(fileName)) {
                    fs_1.default.unlinkSync(fullPath);
                    console.log(`🗑️  Deleted orphaned file: ${fileName}`);
                    deletedCount++;
                }
            }
            catch (err) {
                console.error(`⚠️  Failed to process ${fullPath}:`, err);
            }
        }
    }
    console.log(`✅ Cleanup complete. Deleted ${deletedCount} orphaned files.`);
}
cleanupOrphanedFiles()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=cleanup.js.map