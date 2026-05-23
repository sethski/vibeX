import { createServer } from "./server.js";

const port = Number(process.env.VIBEX_PORT ?? 7742);
await createServer().listen(port);
console.log(`vibeX server listening on http://127.0.0.1:${port}`);
