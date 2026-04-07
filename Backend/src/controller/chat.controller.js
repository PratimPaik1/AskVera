import chatModel from "../models/chat.model.js"
import messageModel from '../models/message.model.js'
import { randomUUID } from "crypto"
import { generateChatTitle, generateMessageStream } from "../services/ai.services.js"
import { getIo } from "../sockets/server.socket.js"

export async function sendMessage(req, res) {
    const { message, chatId, requestId } = req.body
    const io = getIo()
    const socketRoom = `user:${req.user.id}`
    const streamRequestId = requestId || randomUUID()

    try {
        let title = null, chat = null
        const isNewChat = !chatId

        if (!chatId) {
            title = await generateChatTitle(message)
            chat = await chatModel.create({
                user: req.user.id,
                title: title
            })
        }
        else {
            chat = await chatModel.findOne({ _id: chatId, user: req.user.id });
            if (!chat) {
                return res.status(404).json({
                    message: "chat not found",
                    status: false
                })
            }
            title = chat?.title;
        }

        const currentChatId = chatId || chat._id;

        await messageModel.create({
            chat: currentChatId,
            content: message,
            role: 'user'
        })

        io.to(socketRoom).emit("chat:stream:start", {
            requestId: streamRequestId,
            chatId: currentChatId.toString(),
            title,
            isNewChat,
            userMessage: message
        })

        const allMessages = await messageModel
            .find({ chat: currentChatId })
            .sort({ createdAt: -1 })
            .limit(15);

        const orderedMessages = allMessages.reverse();

        const response = await generateMessageStream(orderedMessages, (delta) => {
            io.to(socketRoom).emit("chat:stream:chunk", {
                requestId: streamRequestId,
                chatId: currentChatId.toString(),
                delta
            })
        });

        const aiMessage = await messageModel.create({
            chat: currentChatId,
            content: response,
            role: 'ai'
        })

        io.to(socketRoom).emit("chat:stream:end", {
            requestId: streamRequestId,
            chatId: currentChatId.toString(),
            content: response
        })

        res.status(201).json({
            title,
            chat,
            aiMessage,
            requestId: streamRequestId
        })
    } catch (err) {
        io.to(socketRoom).emit("chat:stream:error", {
            requestId: streamRequestId,
            chatId,
            error: err?.message || "Failed to stream response"
        })

        res.status(500).json({
            message: "Failed to process chat message",
            status: false
        })
    }
}


export async function getChats(req,res) {
    const user=req.user

    const chats=await chatModel.find({
        user:user.id
    }).sort({ createdAt: -1 })
    res.status(200).json({
        message:"chat fetched sucessfully",
        status:true,
        chats
    })
}

export async function getMessage(req,res) {
    const {chatId}=req.params
    console.log(chatId)
    const user=req.user
    const chat =await chatModel.findOne({
        _id:chatId,
        user:user.id
    })

    if(!chat){
        return res.status(404).json({
            message:"chat not found",
            status:false
        })
    }
    const messages=await messageModel.find({
        chat:chatId
    })
     res.status(200).json({
        message: "Messages retrieved successfully",
        messages
    })
}
