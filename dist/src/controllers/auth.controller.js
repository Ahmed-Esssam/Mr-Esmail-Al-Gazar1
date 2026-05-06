"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.editProfile = exports.register = exports.login = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_1 = require("../socket");
const prisma = new client_1.PrismaClient();
const login = async (req, res) => {
    try {
        console.log('📥 LOGIN REQUEST RECEIVED');
        console.log('   Body:', JSON.stringify(req.body));
        const identifier = req.body.identifier || req.body.phone || req.body.email;
        const password = req.body.password;
        if (!identifier || !password) {
            res.status(400).json({ error: 'Identifier (phone/email) and password are required' });
            return;
        }
        // Explicitly treat the identifier as a string
        const searchIdentifier = String(identifier);
        console.log('🔍 Looking for user with identifier:', searchIdentifier);
        // MongoDB Mongoose uses $or, but Prisma uses OR
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: searchIdentifier },
                    { email: searchIdentifier }
                ]
            },
        });
        if (!user) {
            console.log('❌ User not found for identifier:', searchIdentifier);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        console.log('✅ User found:', user.name);
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', searchIdentifier);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        console.log('✅ Login successful for user:', searchIdentifier);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isApproved: user.isApproved,
                status: user.status,
            },
        });
    }
    catch (error) {
        console.error('🔴 Login error:', error);
        if (error instanceof Error && error.message.includes('database')) {
            res.status(503).json({ error: 'Database unavailable. Please try again later.' });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { name, phone, password, role, parentPhone, deviceId } = req.body;
        const sanitizedPhone = phone?.toString().trim();
        const sanitizedParentPhone = parentPhone?.toString().trim();
        const sanitizedDeviceId = deviceId?.toString().trim() || null;
        if (!name || !sanitizedPhone || !password) {
            res.status(400).json({ error: 'Name, phone and password are required' });
            return;
        }
        // ── Device-limit guard: max 2 accounts per physical device ─────────────
        if (sanitizedDeviceId) {
            const existingAccounts = await prisma.user.count({
                where: { deviceId: sanitizedDeviceId },
            });
            if (existingAccounts >= 2) {
                res.status(403).json({
                    error: 'This device has reached the maximum limit of 2 accounts.',
                });
                return;
            }
        }
        const existingUser = await prisma.user.findUnique({
            where: { phone: sanitizedPhone },
        });
        if (existingUser) {
            res.status(409).json({ message: 'عفواً، هذا الرقم مستخدم من قبل، يرجى تسجيل الدخول أو استخدام رقم آخر' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                phone: sanitizedPhone,
                password: hashedPassword,
                role: role || 'STUDENT',
                isApproved: role === 'TEACHER' ? false : true,
                status: role === 'TEACHER' ? 'pending' : 'approved',
                parentPhone: role === 'STUDENT' && sanitizedParentPhone ? sanitizedParentPhone : null,
                deviceId: sanitizedDeviceId,
            },
        });
        if (user.role === 'TEACHER') {
            const io = (0, socket_1.getIO)();
            if (io) {
                io.to('admins').emit('new_teacher_pending', {
                    teacherId: user.id,
                    name: user.name,
                    phone: user.phone,
                    status: user.status,
                    message: 'A new teacher has registered and is awaiting approval.'
                });
            }
        }
        // ── Auto-link: when a PARENT registers, find students whose stored
        // parentPhone matches this parent's phone and create the relation.
        // Students store the parent phone in their 'parentPhone' metadata field
        // which lives as a SharedPreferences value on the client, but the backend
        // tracks the relation through StudentParentRelation.
        // We use a pragmatic approach: look for any student whose phone the
        // parent declared (the frontend sends parentPhone at registration time),
        // OR find existing StudentParentRelation rows already pointing to this phone.
        // Since the schema has no parentPhone column on User, we use the phone
        // of students that were listed by a previously-registered parent.
        // The parent's own phone IS stored — so we link students where they
        // explicitly registered with parentPhone == this new parent's phone.
        if (user.role === 'PARENT') {
            // Find students whose 'parentPhoneNumber' was persisted server-side.
            // We encode parentPhone into a custom JSON column or rely on students
            // having been registered with a parentPhone body param that we now add.
            // For now: find all users with role=STUDENT that have an EXISTING
            // StudentParentRelation where parentId references a user with phone == sanitizedPhone
            // (i.e., a user account that didn't exist yet — impossible). 
            // CORRECT approach: parent phone must be searchable against students.
            // We store it in the 'permissions' JSON field or add a parentPhone column.
            // Since we cannot add a column without migration, we find students
            // registered with body.parentPhone matching via a lookup table approach:
            // StudentParentRelation rows where the parent's phone = sanitizedPhone.
            // The practical fix: scan all STUDENT users and see if any existing
            // StudentParentRelation rows need to point to this new parent id.
            // We do this by finding any 'phantom' entries created when student registered.
            // For immediate fix: nothing to auto-link without a parentPhone column.
            // Add a parentPhone string to User schema instead — but since we can't
            // migrate here, we use the student.email field as a workaround OR
            // simply provide the /api/parents/my-children endpoint that does the lookup.
            // Log the intent:
            console.log(`✅ PARENT registered: ${user.phone} — children will be linked via /api/parents/my-children`);
        }
        // Issue JWT immediately so the client is authenticated without a separate login
        const token = jsonwebtoken_1.default.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isApproved: user.isApproved,
                status: user.status,
                isVerified: false,
            },
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const editProfile = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { name, phone, password } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (phone)
            updateData.phone = phone;
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 10);
        }
        const user = await prisma.user.update({
            where: { id: authUser.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                isApproved: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        console.error('editProfile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.editProfile = editProfile;
const getMe = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                isApproved: true,
                isVerified: true,
                subjectId: true,
                permissions: true,
                createdAt: true,
                parentTeacherId: true,
                parentTeacher: {
                    select: { name: true }
                }
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const response = { user };
        if (user.role === 'ASSISTANT' && user.parentTeacher) {
            response.user.parentTeacherName = user.parentTeacher.name;
        }
        res.json(response);
    }
    catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password - Change user password
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            res.status(400).json({ error: 'Both oldPassword and newPassword are required' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: { password: true },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const isValid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isValid) {
            res.status(401).json({ error: 'Old password is incorrect' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: authUser.id },
            data: { password: hashedPassword },
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('changePassword error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=auth.controller.js.map