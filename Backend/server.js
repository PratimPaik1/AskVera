import dotenv from "dotenv";
dotenv.config();

import http from "http"
import { inintSocket } from "./src/sockets/server.socket.js";

import app from "./src/app.js";
import connectDB from "./src/config/database.js";

connectDB()
// testAi()

const httpServer=http.createServer(app)

inintSocket(httpServer)

httpServer.listen(3000, () => {
    console.log("server is running at port 3000");
});