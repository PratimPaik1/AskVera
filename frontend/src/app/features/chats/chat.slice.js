import { createSlice } from '@reduxjs/toolkit';


const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        chats: {},
        currentChatId: null,
        isLoading: false,
        error: null,
    },
    reducers: {
        createNewChat: (state, action) => {
            const { chatId, title } = action.payload
            if (!chatId) return

            state.chats[ chatId ] = {
                ...(state.chats[ chatId ] || {}),
                id: chatId,
                title: title || state.chats[ chatId ]?.title || "New Chat",
                messages: state.chats[ chatId ]?.messages || [],
                lastUpdated: new Date().toISOString(),
            }
        },
        addNewMessage: (state, action) => {
            const { chatId, content, role } = action.payload
            if (!chatId) return
            if (!state.chats[ chatId ]) {
                state.chats[ chatId ] = {
                    id: chatId,
                    title: "New Chat",
                    messages: [],
                    lastUpdated: new Date().toISOString(),
                }
            }
            state.chats[ chatId ].messages.push({ content, role })
            state.chats[ chatId ].lastUpdated = new Date().toISOString()
        },
        addMessages: (state, action) => {
            const { chatId, messages } = action.payload
            if (!chatId) return
            if (!state.chats[ chatId ]) {
                state.chats[ chatId ] = {
                    id: chatId,
                    title: "New Chat",
                    messages: [],
                    lastUpdated: new Date().toISOString(),
                }
            }
            state.chats[ chatId ].messages.push(...messages)
            state.chats[ chatId ].lastUpdated = new Date().toISOString()
        },
        setChats: (state, action) => {
            const incomingChats = action.payload || {}
            const mergedChats = { ...state.chats, ...incomingChats }

            Object.keys(mergedChats).forEach((chatId) => {
                const existingMessages = state.chats[ chatId ]?.messages || []
                const nextMessages = mergedChats[ chatId ]?.messages || []

                // Prevent wiping already-loaded local messages with an empty fetch payload.
                if (existingMessages.length > 0 && nextMessages.length === 0) {
                    mergedChats[ chatId ].messages = existingMessages
                }
            })

            state.chats = mergedChats
        },
        setCurrentChatId: (state, action) => {
            state.currentChatId = action.payload
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload
        },
        setError: (state, action) => {
            state.error = action.payload
        },
    }
})

export const { setChats, setCurrentChatId, setLoading, setError, createNewChat, addNewMessage, addMessages } = chatSlice.actions
export default chatSlice.reducer


