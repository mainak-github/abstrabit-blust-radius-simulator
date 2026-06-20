"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
let io;
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        // eslint-disable-next-line no-console
        console.log(`[socket] client connected: ${socket.id}`);
        socket.on("disconnect", () => {
            // eslint-disable-next-line no-console
            console.log(`[socket] client disconnected: ${socket.id}`);
        });
    });
    return io;
}
function getIO() {
    return io;
}
//# sourceMappingURL=io.js.map