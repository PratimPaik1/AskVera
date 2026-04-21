import {
  getChatSocket,
  initializationSocketConnection,
} from "../../chats/services/chat.socket.js";

export function initializeBuildSocket(userId) {
  return initializationSocketConnection(userId);
}

export function getBuildSocket() {
  return getChatSocket();
}
