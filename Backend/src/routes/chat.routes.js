import {Router} from "express"
import { sendMessage ,getChats,getMessage} from "../controller/chat.controller.js"
import { identifyUser } from "../middleware/auth.middlewares.js"

const chatRouter=Router()

chatRouter.post("/message",identifyUser,sendMessage)


chatRouter.get("/getChats",identifyUser,getChats)

chatRouter.get("/:chatId/messages",identifyUser,getMessage)
export default chatRouter
