import { registerController,loginController,verifyEmail, getME,logout } from "../controller/auth.controller.js";
import { registerValidator,loginValidator } from "../validators/auth.validator.js";
import { identifyUser} from "../middleware/auth.middlewares.js";
import {Router} from "express"

const authRouter=Router()

authRouter.post('/register',registerValidator,registerController)

authRouter.post("/login",loginValidator,loginController)


authRouter.get("/verifyEmail",verifyEmail)


authRouter.get("/getME",identifyUser,getME)


authRouter.get("/logout",logout)
export default authRouter