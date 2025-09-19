import mongoose from "mongoose";
import { SHARED_STATUS } from "../constants/sharedStatus.js";

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: String,
        required: true,
        default: "public",
    },
    timestamp: { 
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: Object.values(SHARED_STATUS),
        required: true,
        default: SHARED_STATUS.UNDEFINED
    },
    content: {
        type: String,
        required: true,
    }
});

// Static method to find messages by receiver in time order
MessageSchema.statics.getMsg = function(receiver) {
    return this.find({ receiver }).sort({ timestamp: 1 });
};

const Message = mongoose.model("Message", MessageSchema);

export default Message;
