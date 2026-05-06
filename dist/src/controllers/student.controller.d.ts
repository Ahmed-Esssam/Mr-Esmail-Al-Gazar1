import { Request, Response, RequestHandler } from 'express';
export declare const getStudentDashboard: (req: Request, res: Response) => Promise<void>;
export declare const getWeeklyProgress: (req: Request, res: Response) => Promise<void>;
export declare const getRecentLessons: RequestHandler;
export declare const getTeacherStudents: RequestHandler;
export declare const removeStudentEnrollment: RequestHandler;
export declare const getTeacherCoursesForGrading: RequestHandler;
export declare const getCourseAssignments: RequestHandler;
export declare const getCourseQuizzes: RequestHandler;
export declare const getAssignmentSubmissions: RequestHandler;
export declare const updateSubmissionStatus: RequestHandler;
//# sourceMappingURL=student.controller.d.ts.map