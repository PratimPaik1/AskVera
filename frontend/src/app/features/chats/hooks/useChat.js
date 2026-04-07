import { initializationSocketConnection } from "../services/chat.socket.js";
import { sendMessage, getChats, getMessage } from "../services/chat.api.js";
import{ setChats, setCurrentChatId, setLoading, setError, createNewChat, addNewMessage, addMessages } from "../chat.slice";
import { useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";


export const useChat = () => {

    const dispatch = useDispatch()
    const [streamingMessage, setStreamingMessage] = useState(null)
    const socketRef = useRef(null)
    const listenersBoundRef = useRef(false)
    const activeRequestIdRef = useRef(null)
    const streamBuffersRef = useRef({})
    const startReceivedRef = useRef(new Set())
    const finalizedRequestRef = useRef(new Set())
    const userMessageAddedRef = useRef(new Set())
    const socketHandlersRef = useRef({})

    function clearRequestTracking(requestId, { clearFinalized = false } = {}) {
        if (!requestId) return
        delete streamBuffersRef.current[ requestId ]
        startReceivedRef.current.delete(requestId)
        if (activeRequestIdRef.current === requestId) {
            activeRequestIdRef.current = null
        }
        if (clearFinalized) {
            finalizedRequestRef.current.delete(requestId)
            userMessageAddedRef.current.delete(requestId)
        }
    }

    function scheduleCleanup(requestId) {
        setTimeout(() => {
            clearRequestTracking(requestId, { clearFinalized: true })
        }, 60000)
    }

    function bindSocketListeners(socket) {
        if (!socket || listenersBoundRef.current) return

        const onStart = (payload) => {
            const { requestId, chatId, title, isNewChat, userMessage } = payload || {}
            if (!requestId || !chatId) return
            if (finalizedRequestRef.current.has(requestId)) return

            startReceivedRef.current.add(requestId)
            activeRequestIdRef.current = requestId
            streamBuffersRef.current[ requestId ] = ""

            if (isNewChat) {
                dispatch(createNewChat({
                    chatId,
                    title: title || "New Chat",
                }))
            }

            dispatch(setCurrentChatId(chatId))
            if (!userMessageAddedRef.current.has(requestId)) {
                dispatch(addNewMessage({
                    chatId,
                    content: userMessage,
                    role: "user",
                }))
                userMessageAddedRef.current.add(requestId)
            }
            dispatch(setLoading(true))
            setStreamingMessage({ requestId, chatId, content: "" })
        }

        const onChunk = (payload) => {
            const { requestId, chatId, delta } = payload || {}
            if (!requestId || requestId !== activeRequestIdRef.current || !delta) return
            if (finalizedRequestRef.current.has(requestId)) return

            const currentContent = streamBuffersRef.current[ requestId ] || ""
            const nextContent = `${currentContent}${delta}`
            streamBuffersRef.current[ requestId ] = nextContent
            setStreamingMessage({ requestId, chatId, content: nextContent })
        }

        const onEnd = (payload) => {
            const { requestId, chatId, content } = payload || {}
            if (!requestId || requestId !== activeRequestIdRef.current) return
            if (finalizedRequestRef.current.has(requestId)) return

            finalizedRequestRef.current.add(requestId)
            const finalContent = content || streamBuffersRef.current[ requestId ] || ""

            if (finalContent) {
                dispatch(addNewMessage({
                    chatId,
                    content: finalContent,
                    role: "ai",
                }))
            }

            setStreamingMessage(null)
            dispatch(setLoading(false))
            clearRequestTracking(requestId)
            scheduleCleanup(requestId)
        }

        const onError = (payload) => {
            const { requestId, error } = payload || {}
            if (!requestId || requestId !== activeRequestIdRef.current) return
            if (finalizedRequestRef.current.has(requestId)) return

            finalizedRequestRef.current.add(requestId)
            setStreamingMessage(null)
            dispatch(setError(error || "Something went wrong while streaming"))
            dispatch(setLoading(false))
            clearRequestTracking(requestId)
            scheduleCleanup(requestId)
        }

        socket.on("chat:stream:start", onStart)
        socket.on("chat:stream:chunk", onChunk)
        socket.on("chat:stream:end", onEnd)
        socket.on("chat:stream:error", onError)

        socketHandlersRef.current = { onStart, onChunk, onEnd, onError }
        listenersBoundRef.current = true
    }

    function connectSocket(userId) {
        const socket = initializationSocketConnection(userId)
        socketRef.current = socket
        bindSocketListeners(socket)
        return socket
    }

    useEffect(() => {
        return () => {
            const socket = socketRef.current
            const { onStart, onChunk, onEnd, onError } = socketHandlersRef.current
            if (socket && onStart && onChunk && onEnd && onError) {
                socket.off("chat:stream:start", onStart)
                socket.off("chat:stream:chunk", onChunk)
                socket.off("chat:stream:end", onEnd)
                socket.off("chat:stream:error", onError)
            }
            listenersBoundRef.current = false
        }
    }, [])


    async function handleSendMessage({ message, chatId, userId }) {
        dispatch(setLoading(true))
        const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
        activeRequestIdRef.current = requestId
        streamBuffersRef.current[ requestId ] = ""

        connectSocket(userId)

        try {
            const data = await sendMessage({ message, chatId, requestId })
            const { chat, aiMessage } = data
            const resolvedChatId = chatId || chat?._id

            if (!startReceivedRef.current.has(requestId) && resolvedChatId) {
                if (!chatId) {
                    dispatch(createNewChat({
                        chatId: resolvedChatId,
                        title: chat?.title || "New Chat",
                    }))
                }

                if (!userMessageAddedRef.current.has(requestId)) {
                    dispatch(addNewMessage({
                        chatId: resolvedChatId,
                        content: message,
                        role: "user",
                    }))
                    userMessageAddedRef.current.add(requestId)
                }
                dispatch(setCurrentChatId(resolvedChatId))
            }

            if (!finalizedRequestRef.current.has(requestId) && resolvedChatId) {
                const finalContent = aiMessage?.content || streamBuffersRef.current[ requestId ] || ""
                if (finalContent) {
                    dispatch(addNewMessage({
                        chatId: resolvedChatId,
                        content: finalContent,
                        role: "ai",
                    }))
                }
                finalizedRequestRef.current.add(requestId)
                setStreamingMessage(null)
                dispatch(setLoading(false))
                clearRequestTracking(requestId)
                scheduleCleanup(requestId)
            }
        } catch (err) {
            finalizedRequestRef.current.add(requestId)
            dispatch(setError(err?.response?.data?.message || err?.message || "Failed to send message"))
            dispatch(setLoading(false))
            clearRequestTracking(requestId)
            scheduleCleanup(requestId)
        }

    }

    async function handleGetChats() {
        dispatch(setLoading(true))
        const data = await getChats()
        const { chats } = data
        dispatch(setChats(chats.reduce((acc, chat) => {
            acc[ chat._id ] = {
                id: chat._id,
                title: chat.title,
                messages: [],
                lastUpdated: chat.updatedAt,
            }
            return acc
        }, {})))
        dispatch(setLoading(false))
    }

    async function handleOpenChat(chatId, chats) {

        // console.log(chats[ chatId ]?.messages.length)

        if (chats[ chatId ]?.messages.length === 0) {
            const data = await getMessage(chatId)
            const { messages } = data

            const formattedMessages = messages.map(msg => ({
                content: msg.content,
                role: msg.role,
            }))

            dispatch(addMessages({
                chatId,
                messages: formattedMessages,
            }))
        }
        dispatch(setCurrentChatId(chatId))
    }

    return {
        initializationSocketConnection: connectSocket,
        handleSendMessage,
        handleGetChats,
        handleOpenChat,
        streamingMessage
    }

}
