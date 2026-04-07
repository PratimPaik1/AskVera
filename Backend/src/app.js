import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import chatRouter from "./routes/chat.routes.js";
import cors from "cors"
import path from "path"

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();


app.use(express.json()) 

app.use(cookieParser())

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use("/api/auth",authRouter)
app.use("/api/chat",chatRouter)

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/*name", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});
export default app;

