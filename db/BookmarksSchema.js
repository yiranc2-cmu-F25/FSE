import mongoose from "mongoose";


export function makeBookmarkModel(conn) {
    const BookmarkSchema = new mongoose.Schema({
        ownId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmergencyProfile",
            required: true
        },
        createdAt: { type: Date, default: Date.now }
    });

    BookmarkSchema.index({ ownId: 1, profileId: 1 }, { unique: true });

    return conn.model("Bookmark", BookmarkSchema);
}