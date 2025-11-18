export class CoachingBoardDao {
	constructor({ CoachingBoardModel }) {
		this.CoachingBoardModel = CoachingBoardModel;
	}

	#escapeRegex(s) {
		return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	async checkDuplicateTitle({ title, category }) {
		const exists = await this.CoachingBoardModel.exists({ title, category, publicationState: "published" });
		return Boolean(exists);
	}

	async createDraftOrUpdate({ author, payload }) {
		const doc = await this.CoachingBoardModel.findOneAndUpdate(
			{ author, publicationState: "draft" },
			{ $set: { ...payload, author, publicationState: "draft" } },
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		).lean();
		return this.#toBoard(doc);
	}

	async getMyDraft({ author }) {
		const doc = await this.CoachingBoardModel.findOne({ author, publicationState: "draft" }).lean();
		return doc ? this.#toBoard(doc) : null;
	}

	async publishNew({ author, payload }) {
		const doc = await this.CoachingBoardModel.create({
			...payload,
			author,
			publicationState: "published",
			subscribers: [author]
		});
		return this.#toBoard(doc.toObject());
	}

	async deleteDraft({ author }) {
		await this.CoachingBoardModel.deleteOne({ author, publicationState: "draft" });
	}

	async publishFromDraft({ author, payload }) {
		await this.CoachingBoardModel.deleteOne({ author, publicationState: "draft" });
		return await this.publishNew({ author, payload });
	}

	async listPublished() {
		const docs = await this.CoachingBoardModel.find({ publicationState: "published" })
			.sort({ updatedAt: -1, _id: -1 })
			.select("-comments")
			.lean();
		return docs.map(d => this.#toBoard(d));
	}

	async findPublishedByTitleCategory({ title, category }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		const doc = await this.CoachingBoardModel.findOne({
			publicationState: "published",
			title: titleRegex,
			category
		})
			.select({ _id: 1 })
			.lean();
		return doc ? String(doc._id) : null;
	}

	async existsPublishedByTitle({ title, excludeId = null }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		const query = {
			publicationState: "published",
			title: titleRegex
		};
		if (excludeId) {
			query._id = { $ne: excludeId };
		}
		const exists = await this.CoachingBoardModel.exists(query);
		return Boolean(exists);
	}

	async findPublishedByTitle({ title, excludeId = null }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		const query = {
			publicationState: "published",
			title: titleRegex
		};
		if (excludeId) {
			query._id = { $ne: excludeId };
		}
		const doc = await this.CoachingBoardModel.findOne(query)
			.select({ _id: 1 })
			.lean();
		return doc ? String(doc._id) : null;
	}

	async getById({ id }) {
		const doc = await this.CoachingBoardModel.findById(id).lean();
		return doc ? this.#toBoard(doc) : null;
	}

	async updateBoard({ id, author, update }) {
		const updateWithTimestamp = {
			...update,
			contentUpdatedAt: new Date()
		};
		const doc = await this.CoachingBoardModel.findOneAndUpdate(
			{ _id: id, author, publicationState: "published" },
			{ $set: updateWithTimestamp },
			{ new: true }
		).lean();
		return doc ? this.#toBoard(doc) : null;
	}

	async deleteBoard({ id, author }) {
		const result = await this.CoachingBoardModel.deleteOne({
			_id: id,
			author,
			publicationState: "published"
		});
		return result.deletedCount > 0;
	}

	async addComment({ id, author, comment, timestamp }) {
		const update = await this.CoachingBoardModel.findOneAndUpdate(
			{ _id: id, publicationState: "published" },
			{
				$push: {
					comments: {
						comment,
						author,
						timestamp
					}
				}
			},
			{ new: true }
		).lean();
		return update ? this.#toBoard(update) : null;
	}

	async addReply({ id, commentId, author, reply, timestamp, replyTo = null }) {
		const update = await this.CoachingBoardModel.findOneAndUpdate(
			{ _id: id, publicationState: "published", "comments._id": commentId },
			{
				$push: {
					"comments.$.replies": {
						reply,
						author,
						timestamp,
						replyTo
					}
				}
			},
			{ new: true }
		).lean();
		return update ? this.#toBoard(update) : null;
	}

	async subscribe({ id, userId }) {
		await this.CoachingBoardModel.updateOne(
			{ _id: id },
			{ $addToSet: { subscribers: userId } }
		);
	}
	
	async unsubscribe({ id, userId }) {
		await this.CoachingBoardModel.updateOne(
			{ _id: id },
			{ $pull: { subscribers: userId } }
		);
	}

	async #findBoardAndComment({ id, commentId }) {
		const board = await this.CoachingBoardModel.findOne({
			_id: id,
			publicationState: "published",
			"comments._id": commentId
		});
		if (!board) return null;
		
		const comment = board.comments.id(commentId);
		if (!comment) return null;
		
		return { board, comment };
	}

	#toggleLike(likesArray, userId) {
		const isLiked = likesArray.some(likeId => String(likeId) === String(userId));
		
		if (isLiked) {
			likesArray.pull(userId);
		} else {
			likesArray.push(userId);
		}
	}

	async #saveAndReturnBoard(board) {
		await board.save();
		return this.#toBoard(board.toObject());
	}

	async toggleCommentLike({ id, commentId, userId }) {
		const result = await this.#findBoardAndComment({ id, commentId });
		if (!result) return null;
		const { board, comment } = result;
		
		if (!comment.likes) comment.likes = [];
		this.#toggleLike(comment.likes, userId);
		
		return await this.#saveAndReturnBoard(board);
	}

	async #findBoardCommentAndReply({ id, commentId, replyId }) {
		const result = await this.#findBoardAndComment({ id, commentId });
		if (!result) return null;
		const { board, comment } = result;
		
		const reply = comment.replies.id(replyId);
		if (!reply) return null;
		
		return { board, comment, reply };
	}

	async toggleReplyLike({ id, commentId, replyId, userId }) {
		const result = await this.#findBoardCommentAndReply({ id, commentId, replyId });
		if (!result) return null;
		const { board, reply } = result;
		
		if (!reply.likes) reply.likes = [];
		this.#toggleLike(reply.likes, userId);
		
		return await this.#saveAndReturnBoard(board);
	}

	async deleteComment({ id, commentId, author }) {
		const result = await this.#findBoardAndComment({ id, commentId });
		if (!result) return null;
		const { board, comment } = result;
		
		if (String(comment.author) !== String(author)) return null;
		
		board.comments.pull(commentId);
		return await this.#saveAndReturnBoard(board);
	}

	async deleteReply({ id, commentId, replyId, author }) {
		const result = await this.#findBoardCommentAndReply({ id, commentId, replyId });
		if (!result) return null;
		const { board, comment, reply } = result;
		
		if (String(reply.author) !== String(author)) return null;
		
		const repliesToDelete = new Set([String(replyId)]);
		
		let foundNew = true;
		while (foundNew) {
			foundNew = false;
			for (const r of comment.replies) {
				const rId = String(r._id);
				if (repliesToDelete.has(rId)) continue;
				
				const rReplyTo = r.replyTo ? String(r.replyTo) : null;
				if (rReplyTo && repliesToDelete.has(rReplyTo)) {
					repliesToDelete.add(rId);
					foundNew = true;
				}
			}
		}
		
		for (const replyIdToDelete of repliesToDelete) {
			comment.replies.pull(replyIdToDelete);
		}
		
		return await this.#saveAndReturnBoard(board);
	}

	async markNotificationSeen({ id, userId }) {
		const board = await this.CoachingBoardModel.findById(id);
		if (!board) return null;
		
		board.notificationSeenAt = (board.notificationSeenAt || []).filter(
			entry => String(entry.userId) !== String(userId)
		);
		
		board.notificationSeenAt.push({
			userId: userId,
			timestamp: new Date()
		});
		
		await board.save();
		return this.#toBoard(board.toObject());
	}

	async getPendingNotificationsForUser({ userId }) {
		const boards = await this.CoachingBoardModel.find({
			publicationState: "published",
			subscribers: userId
		}).lean();
		
		console.log("[getPendingNotificationsForUser] User subscribed to", boards.length, "boards");
		
		const pendingNotifications = [];
		
		for (const board of boards) {
			const seenEntry = (board.notificationSeenAt || []).find(
				entry => String(entry.userId) === String(userId)
			);
			const lastSeenAt = seenEntry ? new Date(seenEntry.timestamp) : null;
			
			const contentUpdatedAt = board.contentUpdatedAt ? new Date(board.contentUpdatedAt) : null;
			
			if (contentUpdatedAt) {
				const timeBuffer = 1000;
				const isNewerThanLastSeen = !lastSeenAt || (contentUpdatedAt.getTime() > lastSeenAt.getTime() + timeBuffer);
				
				if (isNewerThanLastSeen) {
					if (String(board.author) !== String(userId)) {
						console.log("[getPendingNotificationsForUser] Adding board_updated notification for:", board.title);
						pendingNotifications.push({
							type: "board_updated",
							boardId: String(board._id),
							boardTitle: board.title,
							timestamp: contentUpdatedAt
						});
						continue;
					}
				}
			}
			
			if (board.comments && Array.isArray(board.comments)) {
				for (const comment of board.comments) {
					const commentTime = new Date(comment.timestamp || 0);
					if (!lastSeenAt || commentTime > lastSeenAt) {
						if (String(comment.author) !== String(userId)) {
							pendingNotifications.push({
								type: "new_comment",
								boardId: String(board._id),
								boardTitle: board.title,
								commentId: String(comment._id),
								timestamp: commentTime
							});
							break;
						}
					}
					
					if (comment.replies && Array.isArray(comment.replies)) {
						const isUserComment = String(comment.author) === String(userId);
						
						const isReplyToUser = (reply) => {
							if (!reply.replyTo && isUserComment) {
								return true;
							}
							if (reply.replyTo) {
								const parentReply = comment.replies.find(r => String(r._id) === String(reply.replyTo));
								if (parentReply) {
									if (String(parentReply.author) === String(userId)) {
										return true;
									}
									return isReplyToUser(parentReply);
								}
							}
							return false;
						};
						
						for (const reply of comment.replies) {
							const replyTime = new Date(reply.timestamp || 0);
							
							if (isReplyToUser(reply) && (!lastSeenAt || replyTime > lastSeenAt)) {
								if (String(reply.author) !== String(userId)) {
									pendingNotifications.push({
										type: "new_reply",
										boardId: String(board._id),
										boardTitle: board.title,
										commentId: String(comment._id),
										replyId: String(reply._id),
										timestamp: replyTime
									});
									break;
								}
							}
						}
					}
				}
			}
		}
		
		return pendingNotifications.sort((a, b) => 
			new Date(b.timestamp) - new Date(a.timestamp)
		);
	}

	#toBoard(doc) {
		return {
			id: String(doc._id),
			title: doc.title,
			category: doc.category,
			description: doc.description,
			objective: doc.objective,
			steps: doc.steps ?? [],
			relatedSkills: doc.relatedSkills ?? [],
			tools: doc.tools ?? [],
			notes: doc.notes ?? "",
			author: String(doc.author),
			publicationState: doc.publicationState,
			subscribers: (doc.subscribers ?? []).map(String),
			comments: (doc.comments ?? []).map(c => ({
				id: String(c._id),
				comment: c.comment,
				author: String(c.author),
				timestamp: c.timestamp,
				likes: (c.likes ?? []).map(String),
				replies: (c.replies ?? []).map(r => ({
					id: String(r._id),
					reply: r.reply,
					author: String(r.author),
					timestamp: r.timestamp,
					likes: (r.likes ?? []).map(String),
					replyTo: r.replyTo ? String(r.replyTo) : null
				}))
			})),
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			contentUpdatedAt: doc.contentUpdatedAt
		};
	}
}

