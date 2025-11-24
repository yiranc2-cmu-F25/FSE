import mongoose from "mongoose";

export function makeGroupModel(conn) {
    const GroupSchema = new mongoose.Schema({
        groupName: {
            type: String,
            required: true,
            trim: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        timestamp: {
            type: Date,
            default: null
        }
    });

    GroupSchema.index({ owner: 1 });
    GroupSchema.index({ members: 1 });

    return conn.model("Group", GroupSchema);
}
