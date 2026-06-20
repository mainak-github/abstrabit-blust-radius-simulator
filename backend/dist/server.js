"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const io_1 = require("./socket/io");
const PORT = parseInt(process.env.PORT ?? "4000", 10);
const app = (0, app_1.createApp)();
const httpServer = http_1.default.createServer(app);
(0, io_1.initSocket)(httpServer);
httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[server] WebSocket ready`);
});
//# sourceMappingURL=server.js.map