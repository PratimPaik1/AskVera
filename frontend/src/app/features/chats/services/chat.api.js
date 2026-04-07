import axios from "axios"

const server = import.meta.env.VITE_API_URL;

const api=axios.create({
    baseURL:server,
    withCredentials:true
})

export const sendMessage=async ({message,chatId,requestId})=>{

    const response=await api.post("/api/chat/message",{
        message:message,
        chatId:chatId,
        requestId:requestId
    })
    return response.data
}
export const getChats=async ()=>{
    const response=await api.get("/api/chat/getChats")
    return response.data
}
export const getMessage=async (chatId)=>{
    const response=await api.get(`/api/chat/${chatId}/messages`)
    return response.data
} 
