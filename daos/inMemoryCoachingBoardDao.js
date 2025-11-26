export class inMemoryCoachingBoardDao {
	constructor() {
		this.boards = [];
		this.idCounter = 1;
	}

	#escapeRegex(s) {
		return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	#generateId() {
		return String(this.idCounter++);
	}

	#toBoard(doc) {
		return {
			id: String(doc.id || doc._id),
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
				id: String(c.id || c._id),
				comment: c.comment,
				author: String(c.author),
				timestamp: c.timestamp,
				likes: (c.likes ?? []).map(String),
				replies: (c.replies ?? []).map(r => ({
					id: String(r.id || r._id),
					reply: r.reply,
					author: String(r.author),
					timestamp: r.timestamp,
					likes: (r.likes ?? []).map(String),
					replyTo: r.replyTo ? String(r.replyTo) : null
				}))
			})),
			createdAt: doc.createdAt || new Date(),
			updatedAt: doc.updatedAt || new Date(),
			contentUpdatedAt: doc.contentUpdatedAt
		};
	}

	async checkDuplicateTitle({ title, category }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		return this.boards.some(b => 
			b.publicationState === "published" &&
			titleRegex.test(b.title) &&
			b.category === category
		);
	}

	async createDraftOrUpdate({ author, payload }) {
		const authorStr = String(author);
		const existing = this.boards.find(b => 
			String(b.author) === authorStr && 
			b.publicationState === "draft"
		);

		if (existing) {
			Object.assign(existing, payload, {
				author: authorStr,
				publicationState: "draft",
				updatedAt: new Date()
			});
			return this.#toBoard(existing);
		}

		const newBoard = {
			id: this.#generateId(),
			...payload,
			author: authorStr,
			publicationState: "draft",
			subscribers: [],
			comments: [],
			createdAt: new Date(),
			updatedAt: new Date()
		};
		this.boards.push(newBoard);
		return this.#toBoard(newBoard);
	}

	async getMyDraft({ author }) {
		const draft = this.boards.find(b => 
			String(b.author) === String(author) && 
			b.publicationState === "draft"
		);
		return draft ? this.#toBoard(draft) : null;
	}

	async publishNew({ author, payload }) {
		const newBoard = {
			id: this.#generateId(),
			...payload,
			author: String(author),
			publicationState: "published",
			subscribers: [String(author)],
			comments: [],
			createdAt: new Date(),
			updatedAt: new Date()
		};
		this.boards.push(newBoard);
		return this.#toBoard(newBoard);
	}

	async deleteDraft({ author }) {
		const index = this.boards.findIndex(b => 
			String(b.author) === String(author) && 
			b.publicationState === "draft"
		);
		if (index !== -1) {
			this.boards.splice(index, 1);
		}
	}

	async publishFromDraft({ author, payload }) {
		await this.deleteDraft({ author });
		return await this.publishNew({ author, payload });
	}

	async listPublished() {
		return this.boards
			.filter(b => b.publicationState === "published")
			.sort((a, b) => {
				const timeA = new Date(a.updatedAt || 0).getTime();
				const timeB = new Date(b.updatedAt || 0).getTime();
				if (timeB !== timeA) return timeB - timeA;
				return String(b.id).localeCompare(String(a.id));
			})
			.map(b => {
				const board = this.#toBoard(b);
				delete board.comments;
				return board;
			});
	}

	async searchBoards({ terms = [], phrase = "", limit = 10, cursor } = {}) {
		if ((!terms || terms.length === 0) && (!phrase || phrase.trim() === "")) {
			return {
				code: 200,
				count: 0,
				items: [],
				nextCursor: null
			};
		}
		
		const { buildSubstringRegex } = await import("../utils/search/search.js");
		const regex = buildSubstringRegex(terms, phrase);
		
		const published = this.boards.filter(b => 
			b.publicationState === "published" && regex.test(b.title)
		);
		
		const sorted = published.sort((a, b) => {
			const timeA = new Date(a.updatedAt || 0).getTime();
			const timeB = new Date(b.updatedAt || 0).getTime();
			if (timeB !== timeA) return timeB - timeA;
			return String(b.id).localeCompare(String(a.id));
		});
		
		const safeLimit = Math.min(Math.max(1, +limit || 10), 100);
		
		let items = sorted;
		if (cursor) {
			const { parseCursor } = await import("../utils/search/cursor.js");
			const parsed = parseCursor(cursor);
			if (parsed) {
				const cursorTime = parsed.ts.getTime();
				items = sorted.filter(b => {
					const bTime = new Date(b.updatedAt || 0).getTime();
					if (bTime < cursorTime) return true;
					if (bTime === cursorTime) {
						return String(b.id) < parsed.idStr;
					}
					return false;
				});
			}
		}
		
		const itemsToReturn = items.slice(0, safeLimit).map(b => ({
			title: b.title,
			category: b.category,
			updatedAt: b.updatedAt,
			_id: b.id
		}));
		
		const hasMore = items.length > safeLimit;
		const last = itemsToReturn[itemsToReturn.length - 1];
		const nextCursor = hasMore && last ? 
			`${new Date(last.updatedAt).toISOString()}|${String(last._id)}` : null;

		return {
			code: 200,
			count: published.length,
			items: itemsToReturn,
			nextCursor
		};
	}

	async findPublishedByTitleCategory({ title, category }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		const board = this.boards.find(b => 
			b.publicationState === "published" &&
			titleRegex.test(b.title) &&
			b.category === category
		);
		return board ? String(board.id) : null;
	}

	async existsPublishedByTitle({ title, excludeId = null }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		return this.boards.some(b => 
			b.publicationState === "published" &&
			titleRegex.test(b.title) &&
			(!excludeId || String(b.id) !== String(excludeId))
		);
	}

	async findPublishedByTitle({ title, excludeId = null }) {
		const titleRegex = new RegExp(`^${this.#escapeRegex(title)}$`, "i");
		const board = this.boards.find(b => 
			b.publicationState === "published" &&
			titleRegex.test(b.title) &&
			(!excludeId || String(b.id) !== String(excludeId))
		);
		return board ? String(board.id) : null;
	}

	async getById({ id }) {
		const board = this.boards.find(b => String(b.id) === String(id));
		return board ? this.#toBoard(board) : null;
	}

	async updateBoard({ id, author, update }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			String(b.author) === String(author) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		Object.assign(board, update, {
			contentUpdatedAt: new Date(),
			updatedAt: new Date()
		});
		return this.#toBoard(board);
	}

	async deleteBoard({ id, author }) {
		const index = this.boards.findIndex(b => 
			String(b.id) === String(id) &&
			String(b.author) === String(author) &&
			b.publicationState === "published"
		);
		if (index === -1) return false;
		this.boards.splice(index, 1);
		return true;
	}

	async addComment({ id, author, comment, timestamp }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		if (!board.comments) board.comments = [];
		board.comments.push({
			id: this.#generateId(),
			comment,
			author: String(author),
			timestamp: timestamp || new Date(),
			likes: [],
			replies: []
		});
		board.updatedAt = new Date();
		return this.#toBoard(board);
	}

	async addReply({ id, commentId, author, reply, timestamp, replyTo = null }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		const comment = board.comments?.find(c => String(c.id) === String(commentId));
		if (!comment) return null;

		if (!comment.replies) comment.replies = [];
		comment.replies.push({
			id: this.#generateId(),
			reply,
			author: String(author),
			timestamp: timestamp || new Date(),
			likes: [],
			replyTo: replyTo ? String(replyTo) : null
		});
		board.updatedAt = new Date();
		return this.#toBoard(board);
	}

	async subscribe({ id, userId }) {
		const board = this.boards.find(b => String(b.id) === String(id));
		if (!board) return;
		if (!board.subscribers) board.subscribers = [];
		const userIdStr = String(userId);
		if (!board.subscribers.some(sub => String(sub) === userIdStr)) {
			board.subscribers.push(userIdStr);
			if (!board.notificationSeenAt) board.notificationSeenAt = [];
			board.notificationSeenAt = board.notificationSeenAt.filter(
				entry => String(entry.userId) !== String(userIdStr)
			);
			board.notificationSeenAt.push({
				userId: userIdStr,
				timestamp: new Date()
			});
		}
	}

	async unsubscribe({ id, userId }) {
		const board = this.boards.find(b => String(b.id) === String(id));
		if (!board || !board.subscribers) return;
		const userIdStr = String(userId);
		board.subscribers = board.subscribers.filter(sub => String(sub) !== userIdStr);
	}

	#toggleLike(likesArray, userId) {
		const userIdStr = String(userId);
		const index = likesArray.findIndex(likeId => String(likeId) === userIdStr);
		if (index !== -1) {
			likesArray.splice(index, 1);
		} else {
			likesArray.push(userIdStr);
		}
	}

	async toggleCommentLike({ id, commentId, userId }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		const comment = board.comments?.find(c => String(c.id) === String(commentId));
		if (!comment) return null;

		if (!comment.likes) comment.likes = [];
		this.#toggleLike(comment.likes, userId);
		board.updatedAt = new Date();
		return this.#toBoard(board);
	}

	async toggleReplyLike({ id, commentId, replyId, userId }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		const comment = board.comments?.find(c => String(c.id) === String(commentId));
		if (!comment) return null;

		const reply = comment.replies?.find(r => String(r.id) === String(replyId));
		if (!reply) return null;

		if (!reply.likes) reply.likes = [];
		this.#toggleLike(reply.likes, userId);
		board.updatedAt = new Date();
		return this.#toBoard(board);
	}

	async deleteComment({ id, commentId, author }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		const comment = board.comments?.find(c => 
			String(c.id) === String(commentId) &&
			String(c.author) === String(author)
		);
		if (!comment) return null;

		board.comments = board.comments.filter(c => String(c.id) !== String(commentId));
		board.updatedAt = new Date();
		return this.#toBoard(board);
	}

	async deleteReply({ id, commentId, replyId, author }) {
		const board = this.boards.find(b => 
			String(b.id) === String(id) &&
			b.publicationState === "published"
		);
		if (!board) return null;

		const comment = board.comments?.find(c => String(c.id) === String(commentId));
		if (!comment) return null;

		const reply = comment.replies?.find(r => 
			String(r.id) === String(replyId) &&
			String(r.author) === String(author)
		);
		if (!reply) return null;

		// Delete reply and all replies to it
		const repliesToDelete = new Set([String(replyId)]);
		let foundNew = true;
		while (foundNew) {
			foundNew = false;
			for (const r of comment.replies || []) {
				const rId = String(r.id);
				if (repliesToDelete.has(rId)) continue;
				const rReplyTo = r.replyTo ? String(r.replyTo) : null;
				if (rReplyTo && repliesToDelete.has(rReplyTo)) {
					repliesToDelete.add(rId);
					foundNew = true;
				}
			}
		}

		comment.replies = comment.replies.filter(r => !repliesToDelete.has(String(r.id)));
		board.updatedAt = new Date();
		return this.#toBoard(board);
	}

	async markNotificationSeen({ id, userId }) {
		const board = this.boards.find(b => String(b.id) === String(id));
		if (!board) return null;

		if (!board.notificationSeenAt) board.notificationSeenAt = [];
		board.notificationSeenAt = board.notificationSeenAt.filter(
			entry => String(entry.userId) !== String(userId)
		);
		board.notificationSeenAt.push({
			userId: userId,
			timestamp: new Date()
		});
		return this.#toBoard(board);
	}

	async getPendingNotificationsForUser({ userId }) {
		const pendingNotifications = [];
		const subscribedBoardIds = new Set();

		// Find subscribed boards
		const subscribedBoards = this.boards.filter(b => 
			b.publicationState === "published" &&
			b.subscribers?.some(sub => String(sub) === String(userId))
		);
		subscribedBoards.forEach(b => subscribedBoardIds.add(String(b.id)));

		// Find boards with user activity
		const boardsWithUserActivity = this.boards.filter(b => 
			b.publicationState === "published" &&
			(b.comments?.some(c => String(c.author) === String(userId)) ||
			 b.comments?.some(c => c.replies?.some(r => String(r.author) === String(userId))))
		);

		// Merge boards
		const allBoards = new Map();
		[...subscribedBoards, ...boardsWithUserActivity].forEach(b => {
			allBoards.set(String(b.id), b);
		});

		for (const board of allBoards.values()) {
			const isSubscribed = subscribedBoardIds.has(String(board.id));
			const seenEntry = (board.notificationSeenAt || []).find(
				entry => String(entry.userId) === String(userId)
			);
			const lastSeenAt = seenEntry ? new Date(seenEntry.timestamp) : null;
			const contentUpdatedAt = board.contentUpdatedAt ? new Date(board.contentUpdatedAt) : null;

			// Board updated and new_comment notifications for subscribed boards
			if (isSubscribed) {
				if (contentUpdatedAt && (!lastSeenAt || contentUpdatedAt.getTime() > lastSeenAt.getTime() + 1000)) {
					if (String(board.author) !== String(userId)) {
						pendingNotifications.push({
							type: "board_updated",
							boardId: String(board.id),
							boardTitle: board.title,
							timestamp: contentUpdatedAt
						});
						continue;
					}
				}

				if (board.comments) {
					for (const comment of board.comments) {
						const commentTime = new Date(comment.timestamp || 0);
						if ((!lastSeenAt || commentTime > lastSeenAt) && String(comment.author) !== String(userId)) {
							pendingNotifications.push({
								type: "new_comment",
								boardId: String(board.id),
								boardTitle: board.title,
								commentId: String(comment.id),
								timestamp: commentTime
							});
							break;
						}
					}
				}
			}

			// Reply notifications
			if (board.comments) {
				for (const comment of board.comments) {
					if (comment.replies) {
						const isUserComment = String(comment.author) === String(userId);
						const isReplyToUser = (reply) => {
							if (!reply.replyTo && isUserComment) return true;
							if (reply.replyTo) {
								const parentReply = comment.replies.find(r => String(r.id) === String(reply.replyTo));
								if (parentReply && String(parentReply.author) === String(userId)) return true;
								if (parentReply) return isReplyToUser(parentReply);
							}
							return false;
						};

						const sortedReplies = [...comment.replies].sort((a, b) => 
							new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
						);

						for (const reply of sortedReplies) {
							const replyTime = new Date(reply.timestamp || 0);
							if (isReplyToUser(reply) && (!lastSeenAt || replyTime > lastSeenAt) && String(reply.author) !== String(userId)) {
								pendingNotifications.push({
									type: "new_reply",
									boardId: String(board.id),
									boardTitle: board.title,
									commentId: String(comment.id),
									replyId: String(reply.id),
									timestamp: replyTime
								});
								break;
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
}

