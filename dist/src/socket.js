"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        console.log(`🔌 [Socket.IO] New client connected: ${socket.id}`);
        // Admins can join an 'admins' room to receive privileged notifications
        socket.on('joinAdminRoom', () => {
            socket.join('admins');
            console.log(`🔌 [Socket.IO] Client ${socket.id} joined 'admins' room`);
        });
        socket.on('disconnect', () => {
            console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        console.warn('Socket.io not initialized yet!');
    }
    return io;
};
exports.getIO = getIO;
//# sourceMappingURL=socket.js.map