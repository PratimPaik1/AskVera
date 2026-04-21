import express from "express";
import {
  createBuild,
} from "../controller/build.controller.js";

import { identifyUser } from "../middleware/auth.middlewares.js";
const router = express.Router();

router.post("/create", identifyUser,createBuild);

export default router;