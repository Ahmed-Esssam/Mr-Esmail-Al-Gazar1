"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const seedSuperAdmin = async () => {
    try {
        const adminPhone = '01094270799';
        const adminEmail = 'admin@lms.com';
        const adminPassword = await bcryptjs_1.default.hash('Ahmed1448', 10);
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
        });
        if (!existingAdmin) {
            console.log('🌱 Super Admin not found. Creating default admin account...');
            const admin = await prisma.user.create({
                data: {
                    name: 'Super Admin',
                    phone: adminPhone,
                    email: adminEmail,
                    password: adminPassword,
                    role: 'SUPER_ADMIN',
                    isApproved: true,
                    isVerified: true,
                    permissions: '["ALL"]',
                },
            });
            console.log(`✅ Super Admin created! Phone: ${admin.phone}, Email: ${adminEmail}, Password: Ahmed1448`);
        }
        else {
            console.log('✅ Super Admin account exists. Verifying identifiers...');
            // Logic to update the existing admin if it is missing phone or email
            if (existingAdmin.phone !== adminPhone || existingAdmin.email !== adminEmail) {
                await prisma.user.update({
                    where: { id: existingAdmin.id },
                    data: {
                        phone: adminPhone,
                        email: adminEmail,
                        // We can also reset password here if requested, but let's just update the identifier
                    }
                });
                console.log(`✅ Super Admin updated to ensure Phone: ${adminPhone} and Email: ${adminEmail}`);
            }
            else {
                console.log(`✅ Super Admin identifiers are correct.`);
            }
        }
    }
    catch (error) {
        console.error('❌ Error seeding Super Admin:', error);
    }
};
exports.seedSuperAdmin = seedSuperAdmin;
//# sourceMappingURL=seedAdmin.js.map