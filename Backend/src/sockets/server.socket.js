import {Server} from "socket.io"

let io
export function inintSocket(httpServer){
    io=new Server(httpServer,{
        cors:{
            origin:process.env.FRONTEND_URL,
            credentials:true,
        }

    })
    console.log("socket io server is running")
    io.on("connection",(socket)=>{
        const userId = socket.handshake?.auth?.userId
        if (userId) {
            socket.join(`user:${userId}`)
        }

        console.log("User is connected socket id:"+socket.id)

        socket.on("chat:join-user", ({ userId: joinUserId }) => {
            if (!joinUserId) return
            socket.join(`user:${joinUserId}`)
        })
    })
}
export function getIo(){
    if(!io){
        throw new Error("Socket.io not initialized")
    }
    return io
}
