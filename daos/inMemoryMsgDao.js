import { iMsgDao } from "./iMsgDao.js";

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
    // Normalize IDs to strings for comparison (handles both string and number IDs)
    const senderId = String(sender);
    const receiverId = String(receiver);

    console.log(
      `[inMemoryMsgDao] getPrivateMsg called: sender=${senderId}, receiver=${receiverId}`,
    );
    console.log(`[inMemoryMsgDao] Total messages in DB: ${this.messages.length}`);

    // Log all messages for debugging
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
    // Import search utilities
    const { buildSubstringRegex } = await import("../utils/search/search.js");
    const { parseCursor } = await import("../utils/search/cursor.js");
    
    // Build regex for content search
    const regex = buildSubstringRegex(terms, phrase);
    
    // Filter public messages by content
    let filtered = this.messages.filter(message => {
      const isPublic = message.receiver === null || message.receiver === "public";
      return isPublic && regex.test(message.content);
    });
    
    // Apply cursor if provided
    const parsed = parseCursor(cursor);
    if (parsed) {
      filtered = filtered.filter(message => {
        const msgTs = new Date(message.timestamp);
        const cursorTs = parsed.ts;
        
        // Apply cursor logic: timestamp < cursorTs OR (timestamp === cursorTs AND id < cursorId)
        if (msgTs < cursorTs) return true;
        if (msgTs.getTime() === cursorTs.getTime()) {
          const msgId = String(message.id || message._id);
          return msgId < parsed.idStr;
        }
        return false;
      });
    }
    
    // Sort by timestamp descending, then by id descending
    filtered.sort((a, b) => {
      const tsA = new Date(a.timestamp).getTime();
      const tsB = new Date(b.timestamp).getTime();
      if (tsB !== tsA) return tsB - tsA; // Descending timestamp
      const idA = String(a.id || a._id);
      const idB = String(b.id || b._id);
      return idB.localeCompare(idA); // Descending id
    });
    
    // Apply limit (take one extra to check if there's more)
    const safeLimit = Math.min(Math.max(1, +limit || 10), 100);
    const itemsPlusOne = filtered.slice(0, safeLimit + 1);
    
    const hasMore = itemsPlusOne.length > safeLimit;
    const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;
    
    // Build nextCursor if there's more
    let nextCursor = null;
    if (hasMore && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      const lastTs = new Date(last.timestamp).toISOString();
      const lastId = String(last.id || last._id);
      nextCursor = `${lastTs}|${lastId}`;
    }
    
    // Count total matching items
    const count = filtered.length;
    
    // Populate sender with username
    const UserDac = (await import("../dacs/userDac.js")).default;
    const populatedItems = await Promise.all(
      pageItems.map(async (item) => {
        let senderUsername = null;
        try {
          const user = await UserDac.DAO?.findById?.(item.sender);
          senderUsername = user?.username || null;
        } catch (e) {
          console.log("[inMemoryMsgDao] Could not populate sender:", e.message);
        }
        
        return {
          ...item,
          _id: item.id || item._id,
          sender: senderUsername ? { username: senderUsername } : item.sender,
        };
      })
    );
    
    return { count, items: populatedItems, nextCursor };
  }

  async searchPrivateMsg({ terms, senderId, peerId, phrase, limit = 10, cursor }) {
    // Import search utilities
    const { buildSubstringRegex } = await import("../utils/search/search.js");
    const { parseCursor } = await import("../utils/search/cursor.js");
    
    // Build regex for content search
    const regex = buildSubstringRegex(terms, phrase);
    
    // Normalize IDs to strings
    const senderIdStr = String(senderId);
    const peerIdStr = String(peerId);
    
    // Filter private messages: conversation between senderId and peerId, matching content
    let filtered = this.messages.filter(message => {
      const msgSender = String(message.sender);
      const msgReceiver = String(message.receiver);
      
      // Check if message is part of the conversation
      const isConversation = 
        (msgSender === senderIdStr && msgReceiver === peerIdStr) ||
        (msgSender === peerIdStr && msgReceiver === senderIdStr);
      
      // Check if content matches
      const matchesContent = regex.test(message.content);
      
      return isConversation && matchesContent;
    });
    
    // Apply cursor if provided
    const parsed = parseCursor(cursor);
    if (parsed) {
      filtered = filtered.filter(message => {
        const msgTs = new Date(message.timestamp);
        const cursorTs = parsed.ts;
        
        // Apply cursor logic: timestamp < cursorTs OR (timestamp === cursorTs AND id < cursorId)
        if (msgTs < cursorTs) return true;
        if (msgTs.getTime() === cursorTs.getTime()) {
          const msgId = String(message.id || message._id);
          return msgId < parsed.idStr;
        }
        return false;
      });
    }
    
    // Sort by timestamp descending, then by id descending
    filtered.sort((a, b) => {
      const tsA = new Date(a.timestamp).getTime();
      const tsB = new Date(b.timestamp).getTime();
      if (tsB !== tsA) return tsB - tsA; // Descending timestamp
      const idA = String(a.id || a._id);
      const idB = String(b.id || b._id);
      return idB.localeCompare(idA); // Descending id
    });
    
    // Apply limit (take one extra to check if there's more)
    const safeLimit = Math.min(Math.max(1, +limit || 10), 100);
    const itemsPlusOne = filtered.slice(0, safeLimit + 1);
    
    const hasMore = itemsPlusOne.length > safeLimit;
    const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;
    
    // Build nextCursor if there's more
    let nextCursor = null;
    if (hasMore && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      const lastTs = new Date(last.timestamp).toISOString();
      const lastId = String(last.id || last._id);
      nextCursor = `${lastTs}|${lastId}`;
    }
    
    // Count total matching items
    const count = filtered.length;
    
    // Populate sender with username
    const UserDac = (await import("../dacs/userDac.js")).default;
    const populatedItems = await Promise.all(
      pageItems.map(async (item) => {
        let senderUsername = null;
        try {
          const user = await UserDac.DAO?.findById?.(item.sender);
          senderUsername = user?.username || null;
        } catch (e) {
          console.log("[inMemoryMsgDao] Could not populate sender:", e.message);
        }
        
        return {
          ...item,
          _id: item.id || item._id,
          sender: senderUsername ? { username: senderUsername } : item.sender,
        };
      })
    );
    
    return { items: populatedItems, nextCursor, count };
  }
}
