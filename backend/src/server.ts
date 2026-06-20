import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { initSocket } from "./socket/io";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

const app = createApp();
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[server] WebSocket ready`);
});
