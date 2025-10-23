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
}
