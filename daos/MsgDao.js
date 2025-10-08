import Message from "../entities/Msg.js";


export class MsgDao {

    constructor({ MessageModel }) {
        this.MessageModel = MessageModel;
    }

    async create ({ sender, receiver, status, content, timestamp}) {
        const doc = await this.MessageModel.create({ sender, receiver, status, content, timestamp });
        return new Message({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        });
    }
    
    async getPrivateMsg(receiver) {
        const docs = await this.MessageModel.find({ receiver }).sort({ timestamp: 1 });
        return docs.map(doc => new Message({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        }));
    }

    async getPublicMsg() {
        const docs = await this.MessageModel.find({ receiver: "public" }).sort({ timestamp: 1 }).populate("sender", "username").lean();
        return docs.map(doc => new Message({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        }));
    }
}
