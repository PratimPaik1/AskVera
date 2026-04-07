import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatMistralAI } from "@langchain/mistralai"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import * as z from "zod"
import { tool, createAgent } from "langchain";

import { searchInternet } from "./internet.services.js"
const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: process.env.GEMINI_API
})

const mistralModel = new ChatMistralAI({
    model: "mistral-small-latest",
    apiKey: process.env.MISTRAL_API_KEY || process.env.MISTAL_API_KEY
})


const searchInternetTools = tool(
    searchInternet,
    {
        name: "searchInternet",
        description: "Useful for answering questions about current events or retrieving real-time information from the internet. Use this when you need up-to-date information or facts not stored in the model.",
        schema: z.object({
            query: z.string().describe("The search query to look up on the internet.")
        })

    }
)

const agent = createAgent({
    model: mistralModel,
    tools: [searchInternetTools]
})

export async function generateMessage(message) {
    try {
        const response = await agent.invoke({
            messages: [
                new SystemMessage(`You are a helpful and precise assistant for answering questions.
                If you don't know the answer, say you don't know. 
                If the question requires up-to-date information, use the "searchInternet" tool to get the latest information from the internet and then answer based on the search results.`),
                 ...(message.map(msg=>{
                    if (msg.role=='user'){
                       return  new HumanMessage(msg.content)
                    }
                    else{
                        return new AIMessage(msg.content)
                    }
                 }))
            ]
        })
        return response.messages[response.messages.length - 1].content
    }
    catch (err) {
        throw err
    }
}

function normalizeChunkText(chunkContent) {
    if (!chunkContent) return ""
    if (typeof chunkContent === "string") return chunkContent

    if (Array.isArray(chunkContent)) {
        return chunkContent
            .map((item) => {
                if (typeof item === "string") return item
                if (item?.type === "text" && typeof item?.text === "string") return item.text
                return ""
            })
            .join("")
    }

    return ""
}

function extractTextContent(content) {
    if (!content) return ""
    if (typeof content === "string") return content

    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === "string") return item
                if (item?.type === "text" && typeof item?.text === "string") return item.text
                return ""
            })
            .join("")
    }

    return ""
}

export async function generateMessageStream(messages, onChunk) {
    try {
        const chatMessages = [
            new SystemMessage(`You are a helpful and precise assistant for answering questions.
                If you don't know the answer, say you don't know.
                If the question requires up-to-date information, use the "searchInternet" tool to get the latest information from the internet and then answer based on the search results.`),
            ...(messages.map(msg => {
                if (msg.role == 'user') {
                    return new HumanMessage(msg.content)
                }
                else {
                    return new AIMessage(msg.content)
                }
            }))
        ]

        const response = await agent.invoke({
            messages: chatMessages
        })

        const finalMessage = response?.messages?.[ response.messages.length - 1 ]
        const finalText = extractTextContent(finalMessage?.content)

        if (typeof onChunk === "function" && finalText) {
            // Keep typing UX while still allowing tool-calling through the agent path.
            for (const char of finalText) {
                onChunk(char)
            }
        }

        return finalText
    } catch (err) {
        throw err
    }
}
export async function generateChatTitle(message) {

    const response = await mistralModel.invoke([
        new SystemMessage(`
            You are a helpful assistant that generates concise and descriptive titles for chat conversations.
            
            User will provide you with the first message of a chat conversation, and you will generate a title that captures the essence of the conversation in 2-4 words. The title should be clear, relevant, and engaging, giving users a quick understanding of the chat's topic.    
        `),
        new HumanMessage(`
            Generate a title for a chat conversation based on the following first message:
            "${message}"
            `)
    ])

    return response.text;

}
