import {io} from "socket.io-client"

const server = import.meta.env.VITE_API_URL;
let socketInstance = null


export const initializationSocketConnection=(userId)=>{
    if (!socketInstance) {
        socketInstance =io(server,{
            withCredentials:true,
            auth: userId ? { userId } : undefined
        })

        socketInstance.on("connect",()=>{
            console.log("Socket is connected")
            if (userId) {
                socketInstance.emit("chat:join-user", { userId })
            }
        })
    } else if (userId) {
        socketInstance.emit("chat:join-user", { userId })
    }

    return socketInstance
}

export const getChatSocket = () => socketInstance
