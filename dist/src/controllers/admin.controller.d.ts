import { RequestHandler } from 'express';
declare const router: import("express-serve-static-core").Router;
/**
 * Factory function: returns a route handler that fetches users by role.
 * Usage: router.get('/teachers', getUsersByRole('TEACHER'))
 */
export declare const getUsersByRole: (role: string) => RequestHandler;
export declare const getSubjects: RequestHandler;
export declare const getAllUsers: RequestHandler;
export declare const login: RequestHandler;
export declare const deleteUser: RequestHandler;
export declare const verifyTeacher: RequestHandler;
export declare const updateUserPermissions: RequestHandler;
export declare const getUserPermissions: RequestHandler;
export declare const getDashboardStats: RequestHandler;
export declare const getPendingTeachers: RequestHandler;
export declare const approveTeacher: RequestHandler;
export declare const getStudentById: RequestHandler;
export declare const getTeacherById: RequestHandler;
export default router;
//# sourceMappingURL=admin.controller.d.ts.map