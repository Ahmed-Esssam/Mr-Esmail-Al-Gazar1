import { RequestHandler } from 'express';
declare const router: import("express-serve-static-core").Router;
export declare const addToBlacklist: (token: string) => void;
export declare const isBlacklisted: (token: string) => boolean;
export declare const logout: RequestHandler;
export declare const blacklistMiddleware: RequestHandler;
export default router;
//# sourceMappingURL=logout.controller.d.ts.map