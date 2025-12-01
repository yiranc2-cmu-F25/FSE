import CoachingBoard from "../entities/CoachingBoard.js";
import User from "../entities/User.js";
import Announcement from "../entities/Announcement.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import { validateTitle, validateRequiredPublishFields, validateBoardData, verifyAtLeastOneUserSkill } from "../utils/coachingBoard/validationHelpers.js";
import { sortCommentsByLikesAndTime, sortRepliesByLikesAndTime, organizeCommentsWithHighlight, limitCommentsForDisplay } from "../utils/coachingBoard/commentHelpers.js";
import { collectUserIdsFromComments, createUsernameMap, enrichCommentsWithAuthorNames } from "../utils/coachingBoard/usernameHelpers.js";
import { emitCoachingBoardComment, emitCoachingBoardReply, emitCoachingBoardNotification, emitCommentDeleted, emitReplyDeleted, findNewComment, findNewReply } from "../utils/coachingBoard/socketHelpers.js";
import { parseReplyFormat, findTargetReplyById, findTargetCommentById, findTargetByUsername, findCascadedReplyIds } from "../utils/coachingBoard/replyHelpers.js";

function getRequesterUserId(req) {
	return String(req?.auth?.id ?? req?.user?.id ?? req?.userId ?? "");
}

function requireAuth(req, res) {
	const requesterId = getRequesterUserId(req);
	if (!requesterId) {
		res.status(401).json({ error: "Unauthorized" });
		return null;
	}
	return requesterId;
}

// Helper functions are now imported from utils/coachingBoard modules

function parsePaginationParams(req) {
	const skip = parseInt(req.query?.skip || "0", 10);
	const limit = parseInt(req.query?.limit || "10", 10);
	return { skip, limit };
}

async function getBoardAndComment(id, commentId) {
	const board = await CoachingBoard.getById({ id });
	if (!board) return { board: null, comment: null };
	
	const comment = commentId ? (board.comments || []).find(c => c.id === commentId) : null;
	return { board, comment };
}

export async function checkDuplicateTitle(req, res) {
	try {
		const title = String(req.query?.title ?? "").trim();
		const category = req.query?.category ? String(req.query.category).trim() : "";
		const excludeId = req.query?.excludeId ? String(req.query.excludeId).trim() : null;
		if (!title) {
			return res.status(400).json({ status: "error", message: "Title parameter is required" });
		}
		if (!validateTitle(title)) {
			return res.status(200).json({ isDuplicate: false, titleValid: false, boardId: null });
		}
		const isDuplicate = await CoachingBoard.existsPublishedByTitle({ title, excludeId });
		let boardId = null;
		if (isDuplicate) {
			boardId = await CoachingBoard.findPublishedByTitle({ title, excludeId });
		}
		return res.status(200).json({ isDuplicate, titleValid: true, boardId });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function listBoards(req, res) {
	try {
		const boards = await CoachingBoard.listPublished();
		return res.status(200).json(boards);
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getBoard(req, res) {
	try {
		const id = String(req.params?.bid ?? "");
		if (!id) return res.status(400).json({ status: "error", message: "Missing board id" });
		
		const board = await CoachingBoard.getById({ id });
		if (!board) return res.status(404).json({ status: "error", message: "Board not found" });
		
		const authorName = await User.getUsernameById(board.author) || "";
		const highlightCommentId = req.query?.highlightComment ? String(req.query.highlightComment) : null;
		const highlightReplyId = req.query?.highlightReply ? String(req.query.highlightReply) : null;
		const cid = req.query?.cid ? String(req.query.cid) : null;
		const rid = req.query?.rid ? String(req.query.rid) : null;

		// Handle single comment/reply view
		if (cid) {
			const comment = (board.comments ?? []).find(c => c.id === cid);
			if (!comment) return res.status(404).json({ status: "error", message: "Comment not found" });
			if (rid) {
				const reply = (comment.replies ?? []).find(r => r.id === rid);
				if (!reply) return res.status(404).json({ status: "error", message: "Reply not found" });
				return res.status(200).json({ ...board, authorName, comments: [{ ...comment, replies: [reply] }] });
			}
			return res.status(200).json({ ...board, authorName, comments: [comment] });
		}

		// Organize and sort comments
		if (board.comments && Array.isArray(board.comments)) {
			board.comments = organizeCommentsWithHighlight(board.comments, highlightCommentId);
		}

		// Enrich with usernames
		if (board.comments && Array.isArray(board.comments)) {
			const userIds = new Set([String(board.author)]);
			const commentUserIds = collectUserIdsFromComments(board.comments);
			commentUserIds.forEach(id => userIds.add(id));
			
			const usernameMap = await createUsernameMap(userIds);
			enrichCommentsWithAuthorNames(board.comments, usernameMap);
		}

		// Limit comments for display
		const limitedComments = limitCommentsForDisplay(
			board.comments || [],
			10,
			highlightCommentId,
			highlightReplyId
		);
		
		return res.status(200).json({ 
			...board, 
			authorName, 
			comments: limitedComments, 
			hasMoreComments: (board.comments || []).length > 10 
		});
	} catch (err) {
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getMoreComments(req, res) {
	try {
		const id = String(req.params?.bid ?? "");
		if (!id) return res.status(400).json({ status: "error", message: "Missing board id" });
		
		const { skip, limit } = parsePaginationParams(req);
		
		const board = await CoachingBoard.getById({ id });
		if (!board) return res.status(404).json({ status: "error", message: "Board not found" });
		
		const allComments = board.comments || [];
		sortCommentsByLikesAndTime(allComments);
		
		const paginatedComments = allComments.slice(skip, skip + limit);
		
		const userIds = collectUserIdsFromComments(paginatedComments);
		const usernameMap = await createUsernameMap(userIds);
		
		for (const comment of paginatedComments) {
			comment.authorName = usernameMap.get(String(comment.author)) || "Unknown";
			if (comment.replies && Array.isArray(comment.replies)) {
				sortRepliesByLikesAndTime(comment.replies);
				comment.totalReplies = comment.replies.length;
				comment.replies = comment.replies.slice(0, 1);
				for (const reply of comment.replies) {
					reply.authorName = usernameMap.get(String(reply.author)) || "Unknown";
				}
			}
		}
		
		const hasMore = skip + limit < allComments.length;
		
		return res.status(200).json({ 
			comments: paginatedComments, 
			hasMore,
			total: allComments.length
		});
	} catch (err) {
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getMoreReplies(req, res) {
	try {
		const id = String(req.params?.bid ?? "");
		const commentId = String(req.params?.cid ?? "");
		if (!id || !commentId) {
			return res.status(400).json({ status: "error", message: "Missing board id or comment id" });
		}
		
		const { skip, limit } = parsePaginationParams(req);
		
		const { board, comment } = await getBoardAndComment(id, commentId);
		if (!board) return res.status(404).json({ status: "error", message: "Board not found" });
		if (!comment) return res.status(404).json({ status: "error", message: "Comment not found" });
		
		if (comment.replies && Array.isArray(comment.replies)) {
			sortRepliesByLikesAndTime(comment.replies);
		}
		
		const allReplies = comment.replies || [];
		const paginatedReplies = allReplies.slice(skip, skip + limit);
		
		const userIds = new Set();
		for (const reply of paginatedReplies) {
			userIds.add(String(reply.author));
		}
		
		const usernameMap = await createUsernameMap(userIds);
		
		for (const reply of paginatedReplies) {
			reply.authorName = usernameMap.get(String(reply.author)) || "Unknown";
		}
		
		const hasMore = skip + limit < allReplies.length;
		
		return res.status(200).json({ 
			replies: paginatedReplies, 
			hasMore,
			total: allReplies.length
		});
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function publishBoard(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

		const validation = await validateRequiredPublishFields(req.body);
		if (!validation.ok) {
			return res.status(400).json({ status: "error", message: validation.message });
		}

		const isDup = await CoachingBoard.checkDuplicateTitle({ title: req.body.title, category: req.body.category });
		if (isDup) {
			return res.status(409).json({
				errorStatus: "DUPLICATE_TITLE",
				message: "A board with this title already exists under this category."
			});
		}

		const okSkill = await verifyAtLeastOneUserSkill(requesterId, req.body.relatedSkills);
		if (!okSkill) {
			return res.status(400).json({ status: "error", message: "At least one related skill must be a verified skill that belongs to you." });
		}

		const boardEntity = new CoachingBoard({
			title: req.body.title,
			category: req.body.category,
			description: req.body.description,
			objective: req.body.objective,
			steps: req.body.steps,
			relatedSkills: req.body.relatedSkills,
			tools: req.body.tools ?? [],
			notes: req.body.notes ?? "",
			author: requesterId,
			publicationState: "published"
		});

		const created = await boardEntity.publishNew();

		// Delete draft (ignore errors)
		try {
			await CoachingBoard.deleteDraft({ author: requesterId });
		} catch (e) {
			// Ignore error if draft deletion fails
		}

		// Create announcement (ignore errors)
		try {
			const announcement = new Announcement({
				sender: requesterId,
				status: SHARED_STATUS.PUBLIC,
				content: `New Coaching Board Published: ${created.title}`
			});
			await announcement.create();
		} catch (e) {
			// Ignore error if announcement creation fails
		}

		return res.status(201).json({ message: "Board published successfully", boardId: created.id });
	} catch (err) {
		if (err?.code === 11000) {
			return res.status(409).json({
				errorStatus: "DUPLICATE_TITLE",
				message: "A board with this title already exists under this category."
			});
		}
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function updateBoard(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		
		const id = String(req.params?.bid ?? "");
		if (!id) return res.status(400).json({ status: "error", message: "Missing board id" });
		
		const currentBoard = await CoachingBoard.getById({ id });
		if (!currentBoard) return res.status(404).json({ status: "error", message: "Board not found" });

		// Build update object from allowed fields
		const update = {};
		const allowed = ["title", "category", "description", "objective", "steps", "relatedSkills", "tools", "notes"];
		for (const key of allowed) {
			if (key in req.body) update[key] = req.body[key];
		}
		
		// Merge with existing data
		const mergedData = {
			title: update.title ?? currentBoard.title,
			category: update.category ?? currentBoard.category,
			description: update.description ?? currentBoard.description,
			objective: update.objective ?? currentBoard.objective,
			steps: update.steps ?? currentBoard.steps ?? [],
			relatedSkills: update.relatedSkills ?? currentBoard.relatedSkills ?? [],
			tools: update.tools ?? currentBoard.tools ?? [],
			notes: update.notes ?? currentBoard.notes ?? ""
		};
		
		// Validate merged data
		const validation = await validateBoardData(mergedData);
		if (!validation.ok) {
			return res.status(400).json({ status: "error", message: validation.message });
		}
		
		// Verify user has at least one related skill
		const okSkill = await verifyAtLeastOneUserSkill(requesterId, mergedData.relatedSkills);
		if (!okSkill) {
			return res.status(400).json({ status: "error", message: "At least one related skill must be a verified skill that belongs to you." });
		}

		const updated = await CoachingBoard.updateBoard({ id, author: requesterId, update });
		if (!updated) return res.status(403).json({ status: "error", message: "You do not have permission to edit this board" });

		// Emit notification to subscribers
		if (String(updated.author) === String(requesterId) && updated.subscribers) {
			const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
			const subscribers = (updated.subscribers || []).filter(subId => String(subId) !== String(requesterId));
			if (subscribers.length > 0) {
				await emitCoachingBoardNotification(req, subscribers, {
					type: "board_updated",
					boardId: updated.id,
					boardTitle: updated.title,
					authorName: authorName || "Unknown",
					timestamp: new Date()
				});
			}
		}

		return res.status(200).json({ message: "Board updated successfully", boardId: updated.id });
	} catch (err) {
		if (err?.code === 11000) {
			return res.status(409).json({
				errorStatus: "DUPLICATE_TITLE",
				message: "A board with this title already exists under this category."
			});
		}
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteBoard(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		const id = String(req.params?.bid ?? "");
		if (!id) return res.status(400).json({ status: "error", message: "Missing board id" });

		const deleted = await CoachingBoard.deleteBoard({ id, author: requesterId });
		if (!deleted) {
			return res.status(403).json({ status: "error", message: "You do not have permission to delete this board or the board does not exist" });
		}

		return res.status(200).json({ message: "Board deleted successfully" });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

async function handleReplyComment(req, res, id, parsedReply) {
	const { username, targetId, replyText } = parsedReply;
	const requesterId = getRequesterUserId(req);
	
	if (!replyText || !replyText.trim()) {
		return res.status(400).json({ status: "error", message: "Reply text cannot be empty" });
	}
	
	const board = await CoachingBoard.getById({ id });
	if (!board) return res.status(404).json({ status: "error", message: "Board not found" });
	
	let targetReply = null;
	let targetComment = null;
	
	// Find target by ID or username
	if (targetId) {
		if (targetId.startsWith("reply:")) {
			const replyId = targetId.replace("reply:", "");
			const result = findTargetReplyById(board, replyId);
			targetReply = result.targetReply;
			targetComment = result.targetComment;
		} else {
			targetComment = findTargetCommentById(board, targetId);
		}
	} else {
		const result = await findTargetByUsername(board, username);
		targetReply = result.targetReply;
		targetComment = result.targetComment;
	}
	
	if (!targetComment) {
		return res.status(404).json({ status: "error", message: "Comment or reply not found" });
	}
	
	const fullReplyText = `@${username}: ${replyText.trim()}`;
	
	const updated = await CoachingBoard.addReply({
		id,
		commentId: targetComment.id,
		author: requesterId,
		reply: fullReplyText,
		timestamp: new Date(),
		replyTo: targetReply ? targetReply.id : null
	});
	if (!updated) return res.status(404).json({ status: "error", message: "Board not found" });
	
	// Emit socket notifications
	const updatedBoard = await CoachingBoard.getById({ id });
	const newReply = findNewReply(updatedBoard, targetComment.id, requesterId, fullReplyText);
	if (newReply) {
		await emitCoachingBoardReply(req, id, targetComment.id, newReply);
	}
	
	// Notify the target user
	const notifyUserId = targetReply ? String(targetReply.author) : String(targetComment.author);
	if (String(notifyUserId) !== String(requesterId)) {
		const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
		const commentIdStr = String(targetComment.id || targetComment._id || "");
		const replyIdStr = newReply ? String(newReply.id || newReply._id || "") : null;
		
		await emitCoachingBoardNotification(req, [notifyUserId], {
			type: "new_reply",
			boardId: id,
			boardTitle: updatedBoard.title,
			authorName: authorName || "Unknown",
			commentId: commentIdStr,
			replyId: replyIdStr,
			timestamp: new Date()
		});
	}
	
	return res.status(201).json({ message: "Reply added successfully" });
}

async function handleRegularComment(req, res, id, comment) {
	const requesterId = getRequesterUserId(req);
	
	const updated = await CoachingBoard.addComment({
		id,
		author: requesterId,
		comment: comment,
		timestamp: new Date()
	});
	if (!updated) return res.status(404).json({ status: "error", message: "Board not found" });
	
	const updatedBoard = await CoachingBoard.getById({ id });
	
	// Emit socket notifications
	const newComment = findNewComment(updatedBoard, requesterId, comment);
	if (newComment) {
		await emitCoachingBoardComment(req, id, newComment);
	}
	
	// Notify subscribers
	if (updatedBoard.subscribers) {
		const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
		const subscribers = (updatedBoard.subscribers || []).filter(subId => String(subId) !== String(requesterId));
		if (subscribers.length > 0) {
			await emitCoachingBoardNotification(req, subscribers, {
				type: "new_comment",
				boardId: id,
				boardTitle: updatedBoard.title,
				authorName: authorName || "Unknown",
				commentId: newComment ? (newComment.id || newComment._id) : null,
				timestamp: new Date()
			});
		}
	}
	
	return res.status(201).json({ message: "Comment added successfully" });
}

export async function addComment(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		
		const id = String(req.params?.bid ?? "");
		let { comment } = req.body ?? {};
		if (!id || typeof comment !== "string" || !comment.trim()) {
			return res.status(400).json({ status: "error", message: "Missing required fields" });
		}
		
		comment = comment.trim();
		
		// Check if it's a reply format
		const parsedReply = parseReplyFormat(comment);
		if (parsedReply) {
			return await handleReplyComment(req, res, id, parsedReply);
		}
		
		// Handle regular comment
		return await handleRegularComment(req, res, id, comment);
	} catch (err) {
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function toggleCommentLike(req, res) {
	try {
		const requesterId = requireAuth(req, res);
		if (!requesterId) return;
		
		const id = String(req.params?.bid ?? "");
		const commentId = String(req.params?.cid ?? "");
		if (!id || !commentId) {
			return res.status(400).json({ status: "error", message: "Missing required fields" });
		}
		
		const updated = await CoachingBoard.toggleCommentLike({ id, commentId, userId: requesterId });
		if (!updated) return res.status(404).json({ status: "error", message: "Board or comment not found" });
		
		return res.status(200).json({ message: "Like toggled successfully" });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function toggleReplyLike(req, res) {
	try {
		const requesterId = requireAuth(req, res);
		if (!requesterId) return;
		
		const id = String(req.params?.bid ?? "");
		const commentId = String(req.params?.cid ?? "");
		const replyId = String(req.params?.rid ?? "");
		if (!id || !commentId || !replyId) {
			return res.status(400).json({ status: "error", message: "Missing required fields" });
		}
		
		const updated = await CoachingBoard.toggleReplyLike({ id, commentId, replyId, userId: requesterId });
		if (!updated) return res.status(404).json({ status: "error", message: "Board, comment, or reply not found" });
		
		return res.status(200).json({ message: "Like toggled successfully" });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteComment(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		
		const id = String(req.params?.bid ?? "");
		const commentId = String(req.params?.cid ?? "");
		if (!id || !commentId) {
			return res.status(400).json({ status: "error", message: "Missing required fields" });
		}
		
		const deleted = await CoachingBoard.deleteComment({ id, commentId, author: requesterId });
		if (!deleted) {
			return res.status(403).json({ status: "error", message: "You do not have permission to delete this comment or the comment does not exist" });
		}
		
		emitCommentDeleted(req, id, commentId);
		
		return res.status(200).json({ message: "Comment deleted successfully" });
	} catch (err) {
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteReply(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		
		const id = String(req.params?.bid ?? "");
		const commentId = String(req.params?.cid ?? "");
		const replyId = String(req.params?.rid ?? "");
		if (!id || !commentId || !replyId) {
			return res.status(400).json({ status: "error", message: "Missing required fields" });
		}

		// Get board before deletion to find all replies that will be deleted (including cascaded)
		const boardBefore = await CoachingBoard.getById({ id });
		if (!boardBefore) {
			return res.status(404).json({ status: "error", message: "Board not found" });
		}

		const comment = (boardBefore.comments || []).find(c => {
			const cId = c.id || c._id;
			return String(cId) === String(commentId);
		});
		if (!comment) {
			return res.status(404).json({ status: "error", message: "Comment not found" });
		}

		// Find all replies that will be deleted (including cascaded children)
		const repliesToDelete = findCascadedReplyIds(comment, replyId);

		const deleted = await CoachingBoard.deleteReply({ id, commentId, replyId, author: requesterId });
		if (!deleted) {
			return res.status(403).json({ status: "error", message: "You do not have permission to delete this reply or the reply does not exist" });
		}
		
		// Emit socket notification for all deleted replies (including cascaded children)
		for (const deletedReplyId of repliesToDelete) {
			emitReplyDeleted(req, id, commentId, deletedReplyId);
		}
		
		return res.status(200).json({ message: "Reply deleted successfully" });
	} catch (err) {
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addReply(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		const id = String(req.params?.bid ?? "");
		const cid = String(req.params?.cid ?? "");
		const { reply } = req.body ?? {};
		if (!id || !cid || typeof reply !== "string" || !reply.trim()) {
			return res.status(400).json({ status: "error", message: "Missing required fields" });
		}
		const updated = await CoachingBoard.addReply({
			id,
			commentId: cid,
			author: requesterId,
			reply: reply.trim(),
			timestamp: new Date()
		});
		if (!updated) return res.status(404).json({ status: "error", message: "Board or comment not found" });
		return res.status(201).json({ message: "Reply added successfully" });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function saveDraft(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

		const { title = "", category = "", description = "", objective = "", steps = [], relatedSkills = [], tools = [], notes = "" } = req.body ?? {};
		if (title && !validateTitle(title)) {
			return res.status(400).json({ status: "error", message: "Title must be < 50 characters." });
		}
		const boardEntity = new CoachingBoard({
			title,
			category,
			description,
			objective,
			steps,
			relatedSkills,
			tools,
			notes,
			author: requesterId,
			publicationState: "draft"
		});
		const draft = await boardEntity.saveDraft();
		return res.status(200).json({ message: "Your draft has been saved.", draftId: draft.id });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getMyDraft(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		const draft = await CoachingBoard.getMyDraft({ author: requesterId });
		if (!draft) return res.status(204).send();
		return res.status(200).json(draft);
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function subscribeBoard(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		const id = String(req.params?.bid ?? "");
		if (!id) return res.status(400).json({ status: "error", message: "Missing board id" });
		await CoachingBoard.subscribe({ id, userId: requesterId });
		return res.status(204).send();
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getPendingNotifications(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });const notifications = await CoachingBoard.getPendingNotificationsForUser({ userId: requesterId });for (const notif of notifications) {
			if (notif.type === "new_reply" && notif.replyId) {
				const board = await CoachingBoard.getById({ id: notif.boardId });
				if (board && board.comments) {
					for (const comment of board.comments) {
						const commentId = String(comment.id || comment._id || "");
						if (commentId === String(notif.commentId) && comment.replies) {
							const reply = comment.replies.find(r => {
								const rId = r.id || r._id;
								return String(rId) === String(notif.replyId);
							});
							if (reply) {
								try {
									notif.authorName = await User.getUsernameById(reply.author) || "Unknown";
								} catch {
									notif.authorName = "Unknown";
								}
							}
						}
					}
				}
			}
		}return res.status(200).json({ notifications });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function markNotificationSeen(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		
		const boardId = String(req.params?.bid ?? "");
		if (!boardId) return res.status(400).json({ status: "error", message: "Missing board id" });
		
		await CoachingBoard.markNotificationSeen({ id: boardId, userId: requesterId });
		
		return res.status(200).json({ message: "Notification marked as seen" });
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function unsubscribeBoard(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		const id = String(req.params?.bid ?? "");
		if (!id) return res.status(400).json({ status: "error", message: "Missing board id" });
		await CoachingBoard.unsubscribe({ id, userId: requesterId });
		return res.status(204).send();
	} catch (err) {return res.status(500).json({ status: "error", message: "Server error" });
	}
}

