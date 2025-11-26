import { iMsgDao } from "./iMsgDao.js";
import { applyCursorFilter, sortByTimestampDesc, applyPagination, populateSender } from "../utils/search/inMemorySearchHelpers.js";
import { filterInactiveUsers } from "../utils/filterInactiveUsers.js";
import { USER_STATUS } from "../constants/userStatus.js";

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
    const UserDac = (await import("../dacs/userDac.js")).default;
    const { USER_STATUS } = await import("../constants/userStatus.js");
    
    const publicMessages = this.messages
      .filter((m) => m.receiver === null || m.receiver === "public")
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Filter out messages from inactive users
    const filteredMessages = await Promise.all(
      publicMessages.map(async (msg) => {
        try {
          const user = await UserDac.DAO?.findById?.(msg.sender);
          if (user && user.status === USER_STATUS.ACTIVE) {
            return msg;
          }
        } catch (e) {
          // User not found or error, skip this message
        }
        return null;
      })
    );
    
    return filteredMessages.filter(msg => msg !== null);
  }

  async getPrivateMsg(sender, receiver) {
    const senderId = String(sender);
    const receiverId = String(receiver);
    const UserDac = (await import("../dacs/userDac.js")).default;
    const { USER_STATUS } = await import("../constants/userStatus.js");

    console.log(
      `[inMemoryMsgDao] getPrivateMsg called: sender=${senderId}, receiver=${receiverId}`,
    );
    console.log(`[inMemoryMsgDao] Total messages in DB: ${this.messages.length}`);

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

    const sorted = privateMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Filter out messages from inactive users
    const filteredMessages = await Promise.all(
      sorted.map(async (msg) => {
        try {
          const senderUser = await UserDac.DAO?.findById?.(msg.sender);
          const receiverUser = await UserDac.DAO?.findById?.(msg.receiver);
          if (senderUser && senderUser.status === USER_STATUS.ACTIVE &&
              receiverUser && receiverUser.status === USER_STATUS.ACTIVE) {
            return msg;
          }
        } catch (e) {
          // User not found or error, skip this message
        }
        return null;
      })
    );
    
    return filteredMessages.filter(msg => msg !== null);
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
