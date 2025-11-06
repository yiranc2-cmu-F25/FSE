import { iMsgDao } from "./iMsgDao.js";
import { applyCursorFilter, sortByTimestampDesc, applyPagination, populateSender } from "../utils/search/inMemorySearchHelpers.js";

export class inMemoryMsgDao extends iMsgDao {
  constructor() {
    super();
    this.messages = [];
    this.idCounter = 0;
  }

  async create(message) {
    const newMsg = {
      ...message,
      id: ++this.idCounter,
      timestamp: message.timestamp || new Date(),
    };
    this.messages.push(newMsg);
    console.log(`[inMemoryMsgDao] Message created:`, {
      id: newMsg.id,
      sender: newMsg.sender,
      receiver: newMsg.receiver,
      content: newMsg.content,
    });
    console.log(
      `[inMemoryMsgDao] Total messages in DB: ${this.messages.length}`,
    );
    return newMsg;
  }

  async getPublicMsg() {
    return this.messages
      .filter((m) => m.receiver === null || m.receiver === "public")
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async getPrivateMsg(sender, receiver) {
    const senderId = String(sender);
    const receiverId = String(receiver);

    console.log(
      `[inMemoryMsgDao] getPrivateMsg called: sender=${senderId}, receiver=${receiverId}`,
    );
    console.log(`[inMemoryMsgDao] Total messages in DB: ${this.messages.length}`);

    this.messages.forEach((m, idx) => {
      console.log(`[inMemoryMsgDao] Message ${idx}:`, {
        sender: m.sender,
        receiver: m.receiver,
        content: m.content,
      });
    });

    const privateMessages = this.messages.filter((m) => {
      const msgSender = String(m.sender);
      const msgReceiver = String(m.receiver);

      const match = msgSender === senderId && msgReceiver === receiverId;

      if (match) {
        console.log(`[inMemoryMsgDao] Match found:`, {
          msgSender,
          msgReceiver,
          content: m.content,
        });
      }

      return match;
    });

    console.log(`[inMemoryMsgDao] Returning ${privateMessages.length} messages`);

    return privateMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async markMessagesAsRead(senderId, receiverId) {
    const senderIdStr = String(senderId);
    const receiverIdStr = String(receiverId);

    this.messages.forEach((m) => {
      if (String(m.sender) === senderIdStr && String(m.receiver) === receiverIdStr) {
        m.read = true;
      }
    });

    return true;
  }

  async getUnreadMessages(receiverId) {
    const receiverIdStr = String(receiverId);

    return this.messages.filter((m) => {
      return String(m.receiver) === receiverIdStr && !m.read;
    });
  }

  async searchPublicMsg({ terms = [], phrase = "", limit = 10, cursor } = {}) {
    const { buildSubstringRegex } = await import("../utils/search/search.js");
    
    const regex = buildSubstringRegex(terms, phrase);
    
    let filtered = this.messages.filter(message => {
      const isPublic = message.receiver === null || message.receiver === "public";
      return isPublic && regex.test(message.content);
    });
    
    filtered = applyCursorFilter(filtered, cursor);
    
    filtered = sortByTimestampDesc(filtered);
    
    const { pageItems, nextCursor, count } = applyPagination(filtered, limit);
    
    const populatedItems = await populateSender(pageItems, "[inMemoryMsgDao]");
    
    return { count, items: populatedItems, nextCursor };
  }

  async searchPrivateMsg({ terms, senderId, peerId, phrase, limit = 10, cursor }) {
    const { buildSubstringRegex } = await import("../utils/search/search.js");
    
    const regex = buildSubstringRegex(terms, phrase);
    
    const senderIdStr = String(senderId);
    const peerIdStr = String(peerId);
    
    let filtered = this.messages.filter(message => {
      const msgSender = String(message.sender);
      const msgReceiver = String(message.receiver);
      
      const isConversation = 
        (msgSender === senderIdStr && msgReceiver === peerIdStr) ||
        (msgSender === peerIdStr && msgReceiver === senderIdStr);
      
      const matchesContent = regex.test(message.content);
      
      return isConversation && matchesContent;
    });
    
    filtered = applyCursorFilter(filtered, cursor);
    
    filtered = sortByTimestampDesc(filtered);
    
    const { pageItems, nextCursor, count } = applyPagination(filtered, limit);
    
    const populatedItems = await populateSender(pageItems, "[inMemoryMsgDao]");
    
    return { items: populatedItems, nextCursor, count };
  }
}
