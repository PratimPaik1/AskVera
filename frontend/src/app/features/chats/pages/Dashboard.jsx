import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSelector } from 'react-redux'
import { useChat } from '../hooks/useChat.js'
import remarkGfm from 'remark-gfm'
import { FiMenu, FiX } from 'react-icons/fi'

const Dashboard = () => {
  const chat = useChat()
  const [chatInput, setChatInput] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const chats = useSelector((state) => state.chat.chats)
  const currentChatId = useSelector((state) => state.chat.currentChatId)
  const isLoading = useSelector((state) => state.chat.isLoading)
  const user = useSelector((state) => state.auth.user)
  const userId = user?.id || user?._id

  useEffect(() => {
    chat.handleGetChats()
  }, [])

  useEffect(() => {
    if (!userId) return
    chat.initializationSocketConnection(userId)
  }, [userId])

  const handleSubmitMessage = (e) => {
    e.preventDefault()
    const trimmed = chatInput.trim()
    if (!trimmed) return

    chat.handleSendMessage({ message: trimmed, chatId: currentChatId, userId })
    setChatInput('')
  }

  const openChat = (chatId) => {
    chat.handleOpenChat(chatId, chats)
    setIsSidebarOpen(false)
  }

  return (
    <main className="h-screen overflow-hidden bg-[#05070d] text-white flex">

      {/* Sidebar */}
      <aside className={` fixed top-0 left-0 h-full w-72 bg-[#0b0f19] border-r border-white/10 p-4 z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">History</h2>
          <button onClick={() => setIsSidebarOpen(false)}>
            <FiX size={22} />
          </button>
        </div>

        <div className={`space-y-2 overflow-y-auto h-[90%] history pr-5 `}>
          {Object.values(chats).map((chat) => (
            <button
              key={chat.id}
              onClick={() => openChat(chat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg  hover:bg-white/10 transition ${currentChatId == chat.id ? 'border bg-[#251818]' : 'bg-white/4'}`}
            >
              {chat.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Section */}
      <section
        className={`flex-1 flex flex-col relative transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'
          }`}
      >

        {/* Header */}
        <header className="flex items-center gap-4 p-4  bg-[#0b0f19]">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)}>
              <FiMenu size={22} />
            </button>
          )}
          <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">AskVera</h1>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 w-[80%] mx-auto overflow-x-hidden chatSecion">

          {chats[currentChatId]?.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm  w-fit break-words whitespace-pre-wrap overflow-hidden ${message.role === 'user'? 'ml-auto bg-gray-600/80 text-white rounded-br-none': 'mr-auto bg-white/10 text-gray-100 rounded-bl-none'
                }`}
            >
              {message.role === 'user' ? (
                <p>{message.content}</p>
              ) : (
                <div className="prose prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {chat.streamingMessage?.chatId === currentChatId && (
            <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm w-fit break-words whitespace-pre-wrap overflow-hidden mr-auto bg-white/10 text-gray-100 rounded-bl-none">
              <div className="prose prose-invert max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {chat.streamingMessage.content}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* AI Thinking */}
          {isLoading && !chat.streamingMessage && (
            <div className="mr-auto bg-white/10 px-4 py-3 rounded-2xl text-sm flex gap-1">
              <span className="animate-pulse">AskVera is thinking</span>
              <span className="animate-bounce delay-100">.</span>
              <span className="animate-bounce delay-200">.</span>
              <span className="animate-bounce delay-300">.</span>
            </div>
          )}

        </div>

        {/* Input */}
        <footer className="p-4 border-t border-white/10 bg-[#242935] w-[80%] mx-auto mb-[2rem] rounded-2xl">
          <form onSubmit={handleSubmitMessage} className="flex gap-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isLoading}
              className="px-5 py-3  bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl text-white transition disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </footer>
      </section>
    </main>
  )
}

export default Dashboard
