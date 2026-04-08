import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat.js'
import remarkGfm from 'remark-gfm'
import { FiMenu, FiX } from 'react-icons/fi'
import Dictaphone from '../Components/Dictaphone .jsx'

const Dashboard = () => {
  const chat = useChat()
  const [chatInput, setChatInput] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const chats = useSelector((state) => state.chat.chats)
  const currentChatId = useSelector((state) => state.chat.currentChatId)
  const isLoading = useSelector((state) => state.chat.isLoading)
  const authLoading = useSelector((state) => state.auth.loading)
  const user = useSelector((state) => state.auth.user)
  const userId = user?.id || user?._id
  const streamingMessage = chat.streamingMessage
  const isStreamingCurrentChat =
    !!streamingMessage &&
    (!!currentChatId ? streamingMessage.chatId === currentChatId : true)

  useEffect(() => {
    if (!userId) return
    chat.handleGetChats()
  }, [userId])

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

  if (!authLoading && !userId) {
    return <Navigate to="/login" replace />
  }

  return (
   <main className="h-dvh overflow-hidden bg-[#05070d] text-white flex flex-col md:flex-row">

  {/* Sidebar */}
  <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0b0f19] border-r border-white/10 p-4 z-50 transform transition-transform duration-300 md:static md:h-dvh md:shrink-0 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-semibold">History</h2>
      <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
        <FiX size={22} />
      </button>
    </div>

    <div className="space-y-2 overflow-y-auto h-[90%] pr-5">
      {Object.values(chats).map((chat) => (
        <button
          key={chat.id}
          onClick={() => openChat(chat.id)}
          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition ${currentChatId == chat.id ? 'border bg-[#251818]' : 'bg-white/4'}`}
        >
          {chat.title}
        </button>
      ))}
    </div>
  </aside>

  {/* Overlay for mobile */}
  {isSidebarOpen && (
    <div
      className="fixed inset-0 bg-black/40 z-40 md:hidden"
      onClick={() => setIsSidebarOpen(false)}
    />
  )}

  {/* Main Section */}
  <section className="flex-1 min-h-0 flex flex-col relative overflow-x-hidden transition-all duration-300">

    {/* Header */}
    <header className="flex items-center gap-4 p-4 bg-[#0b0f19]">
      {!isSidebarOpen && (
        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden">
          <FiMenu size={22} />
        </button>
      )}
      <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">AskVera</h1>
    </header>

    {/* Chat Area */}
   <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-4 w-full max-w-4xl mx-auto chatSecion">
  {chats[currentChatId]?.messages.map((message, index) => (
    <div
      key={message.id || `${message.role}-${index}-${String(message.content).slice(0, 24)}`}
      className={`max-w-[85%] w-fit px-4 py-3 rounded-2xl text-sm break-words whitespace-pre-wrap overflow-hidden ${
        message.role === 'user'
          ? 'ml-auto bg-gray-600/80 text-white rounded-br-none'
          : 'mr-auto bg-white/10 text-gray-100 rounded-bl-none'
      }`}
    >
      {message.role === 'user' ? (
        <p>{message.content}</p>
      ) : (
        <div className="prose prose-invert max-w-none break-words overflow-x-hidden [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-hidden [&_code]:break-all">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  ))}

  {isStreamingCurrentChat && (
    <div className="max-w-[85%] w-fit mr-auto bg-white/10 px-4 py-3 rounded-2xl text-sm text-gray-100 rounded-bl-none break-words whitespace-pre-wrap overflow-hidden">
      <div className="prose prose-invert max-w-none break-words overflow-x-hidden [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-hidden [&_code]:break-all">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {streamingMessage.content}
        </ReactMarkdown>
      </div>
    </div>
  )}

  {isLoading && !isStreamingCurrentChat && (
    <div className="mr-auto bg-white/10 px-4 py-3 rounded-2xl text-sm text-gray-100 rounded-bl-none flex items-center gap-1">
      <span className="animate-pulse">AskVera is thinking</span>
      <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
    </div>
  )}
</div>
    {/* Input */}
    <footer className="shrink-0 p-4 border-t border-white/10 bg-[#242935] w-full max-w-4xl mx-auto mb-4 md:mb-8 rounded-2xl">
      <form onSubmit={handleSubmitMessage} className="flex items-center gap-2 sm:gap-3">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 min-w-0 px-3 sm:px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/40"
        />
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Dictaphone setChatInput={setChatInput} />
          <button
            type="submit"
            disabled={!chatInput.trim() || isLoading}
            className="px-3 sm:px-5 py-3 bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl text-white transition disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </div>
      </form>
    </footer>
  </section>
</main>
  )
}

export default Dashboard
