import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export declare const initSocket: (server: HttpServer) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any> | null;
//# sourceMappingURL=socket.d.ts.map