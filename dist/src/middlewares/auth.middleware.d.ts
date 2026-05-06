import { Request, RequestHandler } from 'express';
export interface AuthUser {
    id: string;
    phone: string;
    role: string;
    isApproved: boolean;
    status: string;
    parentTeacherId: string | null;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export type AuthRequest = Request;
export declare const authMiddleware: RequestHandler;
export declare const optionalAuthMiddleware: RequestHandler;
export declare const isApprovedUser: RequestHandler;
//# sourceMappingURL=auth.middleware.d.ts.map