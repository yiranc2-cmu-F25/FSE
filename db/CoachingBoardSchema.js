import mongoose from "mongoose";

export function makeCoachingBoardModel(conn) {
	const ReplySchema = new mongoose.Schema(
		{
			reply: { type: String, required: true, trim: true },
			author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
			timestamp: { type: Date, default: Date.now, index: true },
			likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
			replyTo: { type: mongoose.Schema.Types.ObjectId, default: null } // ID of the reply this is replying to (if any)
		},
		{ _id: true }
	);

	const CommentSchema = new mongoose.Schema(
		{
			comment: { type: String, required: true, trim: true },
			author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
			timestamp: { type: Date, default: Date.now, index: true },
			likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
			replies: { type: [ReplySchema], default: [] }
		},
		{ _id: true }
	);

	const CoachingBoardSchema = new mongoose.Schema(
		{
			title: { type: String, required: true, trim: true, maxlength: 50, index: true },
			category: { type: String, required: true, trim: true, index: true },
			description: { type: String, required: true, trim: true },
			objective: { type: String, required: true, trim: true },
			steps: { type: [String], required: true, validate: v => Array.isArray(v) && v.length > 0 },
			relatedSkills: { type: [String], required: true, validate: v => Array.isArray(v) && v.length > 0 },
			tools: { type: [String], default: [] },
			notes: { type: String, default: "" },
			author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
			publicationState: { type: String, enum: ["draft", "published"], required: true, index: true, default: "draft" },
			subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
			comments: { type: [CommentSchema], default: [] },
			notificationSeenAt: [{
				userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
				timestamp: { type: Date, required: true, default: Date.now }
			}],
			contentUpdatedAt: { type: Date, default: null }, // Only updated when board content is edited (not for comment/reply/deletion)
		},
		{ timestamps: true }
	);

	CoachingBoardSchema.index(
		{ title: 1, category: 1, publicationState: 1 },
		{ unique: true, partialFilterExpression: { publicationState: "published" } }
	);

	CoachingBoardSchema.index(
		{ author: 1, publicationState: 1 },
		{ unique: true, partialFilterExpression: { publicationState: "draft" } }
	);
	CoachingBoardSchema.index({ updatedAt: -1, _id: -1 });

	return conn.model("CoachingBoard", CoachingBoardSchema);
}


