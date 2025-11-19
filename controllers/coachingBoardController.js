import CoachingBoard from "../entities/CoachingBoard.js";
import User from "../entities/User.js";
import Announcement from "../entities/Announcement.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

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

function validateTitle(title) {
	return typeof title === "string" && title.trim().length > 0 && title.trim().length < 50;
}

async function validateRequiredPublishFields(body) {
	const { title, category, description, objective, steps, relatedSkills } = body ?? {};
	if (!validateTitle(title)) return { ok: false, message: "Title must be non-empty and < 50 characters." };
	
	const presets = await CategorySkillPresetDac.getPresets();
	const categories = presets.categories || [];
	const skills = presets.skills || [];
	
	if (!categories.includes(category)) return { ok: false, message: "Category must be chosen from system preset." };
	if (typeof description !== "string" || !description.trim()) return { ok: false, message: "Description is required." };
	if (typeof objective !== "string" || !objective.trim()) return { ok: false, message: "Objective is required." };
	if (!Array.isArray(steps) || steps.length === 0) return { ok: false, message: "At least one step is required." };
	if (!Array.isArray(relatedSkills) || relatedSkills.length === 0) return { ok: false, message: "At least one related skill is required." };
	if (!relatedSkills.every(s => skills.includes(s))) return { ok: false, message: "Related Skills must be from system preset." };
	return { ok: true };
}

async function verifyAtLeastOneUserSkill(req, relatedSkills) {
	const requesterId = getRequesterUserId(req);
	if (!requesterId) return false;
	
	try {
		const userSkills = await User.getSkillsById(requesterId);
		return relatedSkills.some(s => userSkills.includes(s));
	} catch (err) {
		console.error("Error verifying user skills:", err);
		return false;
	}
}

async function createUsernameMap(userIds) {
	const usernamePromises = Array.from(userIds).map(async (userId) => {
		try {
			const username = await User.getUsernameById(userId);
			return { userId, username: username || "Unknown" };
		} catch {
			return { userId, username: "Unknown" };
		}
	});
	
	const usernameResults = await Promise.all(usernamePromises);
	const usernameMap = new Map();
	usernameResults.forEach(({ userId, username }) => {
		usernameMap.set(userId, username);
	});
	
	return usernameMap;
}

function sortRepliesByLikesAndTime(replies) {
	if (!Array.isArray(replies)) return;
	replies.sort((a, b) => {
		const aLikes = (a.likes || []).length;
		const bLikes = (b.likes || []).length;
		if (aLikes !== bLikes) {
			return bLikes - aLikes;
		}
		const aTime = new Date(a.timestamp || 0).getTime();
		const bTime = new Date(b.timestamp || 0).getTime();
		return bTime - aTime;
	});
}

function collectUserIdsFromComments(comments) {
	const userIds = new Set();
	for (const comment of comments) {
		userIds.add(String(comment.author));
		if (comment.replies && Array.isArray(comment.replies)) {
			for (const reply of comment.replies) {
				userIds.add(String(reply.author));
			}
		}
	}
	return userIds;
}

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
	} catch (err) {
		console.error("checkDuplicateTitle error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function listBoards(req, res) {
	try {
		const boards = await CoachingBoard.listPublished();
		return res.status(200).json(boards);
	} catch (err) {
		console.error("listBoards error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
		
		if (board.comments && Array.isArray(board.comments)) {
			let highlightedComment = null;
			let otherComments = [];
			
			if (highlightCommentId) {
				const normalizedHighlightId = String(highlightCommentId).trim();
				
				for (const comment of board.comments) {
					const commentId = String(comment.id || comment._id || "").trim();
					
					if (commentId === normalizedHighlightId) {
						highlightedComment = comment;
					} else {
						otherComments.push(comment);
					}
				}
				
				otherComments.sort((a, b) => {
					const aLikes = (a.likes || []).length;
					const bLikes = (b.likes || []).length;
					if (aLikes !== bLikes) {
						return bLikes - aLikes;
					}
					const aTime = new Date(a.timestamp || 0).getTime();
					const bTime = new Date(b.timestamp || 0).getTime();
					return bTime - aTime;
				});
				
				if (highlightedComment) {
					board.comments = [highlightedComment, ...otherComments];
				} else {
					board.comments.sort((a, b) => {
						const aLikes = (a.likes || []).length;
						const bLikes = (b.likes || []).length;
						if (aLikes !== bLikes) {
							return bLikes - aLikes;
						}
						const aTime = new Date(a.timestamp || 0).getTime();
						const bTime = new Date(b.timestamp || 0).getTime();
						return bTime - aTime;
					});
				}
			} else {
				board.comments.sort((a, b) => {
					const aLikes = (a.likes || []).length;
					const bLikes = (b.likes || []).length;
					if (aLikes !== bLikes) {
						return bLikes - aLikes;
					}
					const aTime = new Date(a.timestamp || 0).getTime();
					const bTime = new Date(b.timestamp || 0).getTime();
					return bTime - aTime;
				});
			}
			
			for (const comment of board.comments) {
				if (comment.replies && Array.isArray(comment.replies)) {
					comment.replies.sort((a, b) => {
						const aLikes = (a.likes || []).length;
						const bLikes = (b.likes || []).length;
						if (aLikes !== bLikes) {
							return bLikes - aLikes;
						}
						const aTime = new Date(a.timestamp || 0).getTime();
						const bTime = new Date(b.timestamp || 0).getTime();
						return bTime - aTime;
					});
				}
			}
		}

		if (board.comments && Array.isArray(board.comments)) {
			const userIds = new Set();
			userIds.add(String(board.author));
			for (const comment of board.comments) {
				userIds.add(String(comment.author));
				if (comment.replies && Array.isArray(comment.replies)) {
					for (const reply of comment.replies) {
						userIds.add(String(reply.author));
					}
				}
			}
			
			const usernamePromises = Array.from(userIds).map(async (userId) => {
				try {
					const username = await User.getUsernameById(userId);
					return { userId, username: username || "Unknown" };
				} catch {
					return { userId, username: "Unknown" };
				}
			});
			
			const usernameResults = await Promise.all(usernamePromises);
			const usernameMap = new Map();
			usernameResults.forEach(({ userId, username }) => {
				usernameMap.set(userId, username);
			});
			
			for (const comment of board.comments) {
				comment.authorName = usernameMap.get(String(comment.author)) || "Unknown";
				if (comment.replies && Array.isArray(comment.replies)) {
					for (const reply of comment.replies) {
						reply.authorName = usernameMap.get(String(reply.author)) || "Unknown";
					}
				}
			}
		}

		const cid = req.query?.cid ? String(req.query.cid) : null;
		const rid = req.query?.rid ? String(req.query.rid) : null;
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
		
		const highlightReplyId = req.query?.highlightReply ? String(req.query.highlightReply) : null;
		
		const limitedComments = (board.comments || []).slice(0, 10).map(c => {
			const allReplies = c.replies || [];
			let repliesToShow = [];
			
			if (highlightReplyId && highlightCommentId && String(c.id || c._id) === highlightCommentId) {
				const highlightedReply = allReplies.find(r => String(r.id || r._id) === highlightReplyId);
				if (highlightedReply) {
					repliesToShow = [highlightedReply];
				} else {
					repliesToShow = allReplies.slice(0, 1);
				}
			} else {
				repliesToShow = allReplies.slice(0, 1);
			}
			
			return {
				...c,
				replies: repliesToShow,
				totalReplies: allReplies.length
			};
		});
		
		return res.status(200).json({ ...board, authorName, comments: limitedComments, hasMoreComments: (board.comments || []).length > 10 });
	} catch (err) {
		console.error("getBoard error", err);
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
		
		if (board.comments && Array.isArray(board.comments)) {
			board.comments.sort((a, b) => {
				const aLikes = (a.likes || []).length;
				const bLikes = (b.likes || []).length;
				if (aLikes !== bLikes) {
					return bLikes - aLikes;
				}
				const aTime = new Date(a.timestamp || 0).getTime();
				const bTime = new Date(b.timestamp || 0).getTime();
				return bTime - aTime;
			});
		}
		
		const allComments = board.comments || [];
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
		console.error("getMoreComments error", err);
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
	} catch (err) {
		console.error("getMoreReplies error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function publishBoard(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

		const validation = await validateRequiredPublishFields(req.body);
		if (!validation.ok) return res.status(400).json({ status: "error", message: validation.message });

		const isDup = await CoachingBoard.checkDuplicateTitle({ title: req.body.title, category: req.body.category });
		if (isDup) {
			return res.status(409).json({
				errorStatus: "DUPLICATE_TITLE",
				message: "A board with this title already exists under this category."
			});
		}

		const okSkill = await verifyAtLeastOneUserSkill(req, req.body.relatedSkills);
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

		try {
			await CoachingBoard.deleteDraft({ author: requesterId });
		} catch (e) {
			console.warn("Failed to delete draft after publishing (non-fatal):", e?.message);
		}

		try {
			const announcement = new Announcement({
				sender: requesterId,
				status: SHARED_STATUS.PUBLIC,
				content: `New Coaching Board Published: ${created.title}`
			});
			await announcement.create();
		} catch (e) {
			console.warn("Announcement publishBoard failed (non-fatal):", e?.message);
		}

		return res.status(201).json({ message: "Board published successfully", boardId: created.id });
	} catch (err) {
		console.error("publishBoard error", err);
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

		const update = {};
		const allowed = ["title", "category", "description", "objective", "steps", "relatedSkills", "tools", "notes"];
		for (const key of allowed) {
			if (key in req.body) update[key] = req.body[key];
		}

		if ("title" in update && !validateTitle(update.title)) {
			return res.status(400).json({ status: "error", message: "Title must be non-empty and < 50 characters." });
		}
		
		const presets = await CategorySkillPresetDac.getPresets();
		const categories = presets.categories || [];
		const skills = presets.skills || [];
		
		if ("category" in update && !categories.includes(update.category)) {
			return res.status(400).json({ status: "error", message: "Category must be from preset." });
		}
		if ("relatedSkills" in update) {
			if (!Array.isArray(update.relatedSkills) || update.relatedSkills.length === 0) {
				return res.status(400).json({ status: "error", message: "At least one related skill is required." });
			}
			if (!update.relatedSkills.every(s => skills.includes(s))) {
				return res.status(400).json({ status: "error", message: "Related Skills must be from preset." });
			}
		}

		const updated = await CoachingBoard.updateBoard({ id, author: requesterId, update });
		if (!updated) return res.status(403).json({ status: "error", message: "You do not have permission to edit this board" });

		try {
			const socketInstance = req.app.get("socketInstance");
			if (socketInstance && updated.subscribers) {
				if (String(updated.author) === String(requesterId)) {
					const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
					const subscribers = (updated.subscribers || []).filter(subId => String(subId) !== String(requesterId));
					if (subscribers.length > 0) {
						socketInstance.emitCoachingBoardNotification(subscribers, {
							type: "board_updated",
							boardId: updated.id,
							boardTitle: updated.title,
							authorName: authorName || "Unknown",
							timestamp: new Date()
						});
					}
				}
			}
		} catch (e) {
			console.warn("Socket notification updateBoard failed (non-fatal):", e?.message);
		}

		return res.status(200).json({ message: "Board updated successfully", boardId: updated.id });
	} catch (err) {
		console.error("updateBoard error", err);
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
	} catch (err) {
		console.error("deleteBoard error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
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
		
		const replyMatch = comment.match(/^@([^#:]+)(?:#(reply:[^:]+|[^:]+))?:\s*(.+)$/);
		if (replyMatch) {
			const [, username, targetId, replyText] = replyMatch;
			console.log("[addComment] Reply detected:", { username, targetId, replyText: replyText?.substring(0, 50) });
			if (!replyText || !replyText.trim()) {
				return res.status(400).json({ status: "error", message: "Reply text cannot be empty" });
			}
			
			const board = await CoachingBoard.getById({ id });
			if (!board) return res.status(404).json({ status: "error", message: "Board not found" });
			
			let targetReply = null;
			let targetComment = null;
			
			if (targetId) {
				console.log("[addComment] Looking for target with ID:", targetId);
				if (targetId.startsWith("reply:")) {
					const replyId = targetId.replace("reply:", "");
					console.log("[addComment] Searching for reply ID:", replyId);
					for (const c of (board.comments || [])) {
						const reply = (c.replies || []).find(r => {
							const rId = String(r.id || r._id);
							console.log("[addComment] Comparing reply ID:", rId, "with", replyId, "match:", rId === replyId);
							return rId === replyId;
						});
						if (reply) {
							targetReply = reply;
							targetComment = c;
							console.log("[addComment] Found target reply in comment:", String(c.id || c._id));
							break;
						}
					}
				} else {
					console.log("[addComment] Searching for comment ID:", targetId);
					for (const c of (board.comments || [])) {
						const cId = String(c.id || c._id);
						console.log("[addComment] Comparing comment ID:", cId, "with", targetId, "match:", cId === targetId);
						if (cId === targetId) {
							targetComment = c;
							console.log("[addComment] Found target comment:", cId);
							break;
						}
					}
				}
			} else {
				for (const c of (board.comments || [])) {
					for (const r of (c.replies || [])) {
						const replyAuthorName = await User.getUsernameById(r.author);
						if (replyAuthorName === username) {
							targetReply = r;
							targetComment = c;
							break;
						}
					}
					if (targetReply) break;
					
					if (!targetReply) {
						const commentAuthorName = await User.getUsernameById(c.author);
						if (commentAuthorName === username) {
							targetComment = c;
							break;
						}
					}
				}
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
			
			try {
				const socketInstance = req.app.get("socketInstance");
				if (socketInstance) {
					const updatedBoard = await CoachingBoard.getById({ id });
					const comment = (updatedBoard.comments || []).find(c => c.id === targetComment.id);
					if (comment) {
						const newReply = (comment.replies || []).find(r => 
							String(r.author) === requesterId && 
							r.reply === fullReplyText &&
							Math.abs(new Date(r.timestamp).getTime() - Date.now()) < 5000
						);
						if (newReply) {
							const authorName = await User.getUsernameById(requesterId);
							newReply.authorName = authorName || "Unknown";
							socketInstance.emitCoachingBoardReply(id, targetComment.id, newReply);
						}
					}
				}
			} catch (err) {
				console.warn("Failed to emit reply socket event:", err);
			}
			
			try {
				const socketInstance = req.app.get("socketInstance");
				if (socketInstance) {
					const notifyUserId = targetReply ? String(targetReply.author) : String(targetComment.author);
					
					if (String(notifyUserId) !== String(requesterId)) {
						const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
						const updatedBoard = await CoachingBoard.getById({ id });
						
						const comment = (updatedBoard.comments || []).find(c => {
							const cId = c.id || c._id;
							return String(cId) === String(targetComment.id);
						});
						const newReply = comment ? (comment.replies || []).find(r => 
							String(r.author) === requesterId && 
							r.reply === fullReplyText &&
							Math.abs(new Date(r.timestamp).getTime() - Date.now()) < 5000
						) : null;
						
						const commentIdStr = String(targetComment.id || targetComment._id || "");
						const replyIdStr = newReply ? String(newReply.id || newReply._id || "") : null;
						
						socketInstance.emitCoachingBoardNotification([notifyUserId], {
							type: "new_reply",
							boardId: id,
							boardTitle: updatedBoard.title,
							authorName: authorName || "Unknown",
							commentId: commentIdStr,
							replyId: replyIdStr,
							timestamp: new Date()
						});
					}
				}
			} catch (err) {
				console.warn("Failed to emit reply notification:", err);
			}
			
			return res.status(201).json({ message: "Reply added successfully" });
		}
		
		const updated = await CoachingBoard.addComment({
			id,
			author: requesterId,
			comment: comment,
			timestamp: new Date()
		});
		if (!updated) return res.status(404).json({ status: "error", message: "Board not found" });
		
		const updatedBoard = await CoachingBoard.getById({ id });
		
		try {
			const socketInstance = req.app.get("socketInstance");
			if (socketInstance) {
				const newComment = (updatedBoard.comments || []).find(c => 
					String(c.author) === requesterId && 
					c.comment === comment &&
					Math.abs(new Date(c.timestamp).getTime() - Date.now()) < 5000
				);
				if (newComment) {
					const authorName = await User.getUsernameById(requesterId);
					newComment.authorName = authorName || "Unknown";
					socketInstance.emitCoachingBoardComment(id, newComment);
				}
			}
		} catch (err) {
			console.warn("Failed to emit comment socket event:", err);
		}
		
		try {
			const socketInstance = req.app.get("socketInstance");
			if (socketInstance && updatedBoard.subscribers) {
				const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
				const newComment = (updatedBoard.comments || []).find(c => 
					String(c.author) === requesterId && 
					c.comment === comment &&
					Math.abs(new Date(c.timestamp).getTime() - Date.now()) < 5000
				);
				const subscribers = (updatedBoard.subscribers || []).filter(subId => String(subId) !== String(requesterId));
				if (subscribers.length > 0) {
					socketInstance.emitCoachingBoardNotification(subscribers, {
						type: "new_comment",
						boardId: id,
						boardTitle: updatedBoard.title,
						authorName: authorName || "Unknown",
						commentId: newComment ? (newComment.id || newComment._id) : null,
						timestamp: new Date()
					});
				}
			}
		} catch (err) {
			console.warn("Failed to emit comment notification:", err);
		}
		
		return res.status(201).json({ message: "Comment added successfully" });
	} catch (err) {
		console.error("addComment error", err);
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
	} catch (err) {
		console.error("toggleCommentLike error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
	} catch (err) {
		console.error("toggleReplyLike error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
		
		try {
			const socketInstance = req.app.get("socketInstance");
			if (socketInstance) {
				socketInstance.emitCoachingBoardCommentDeleted(id, commentId);
			}
		} catch (e) {
			console.warn("Socket notification deleteComment failed (non-fatal):", e?.message);
		}
		
		return res.status(200).json({ message: "Comment deleted successfully" });
	} catch (err) {
		console.error("deleteComment error", err);
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
		const deleted = await CoachingBoard.deleteReply({ id, commentId, replyId, author: requesterId });
		if (!deleted) {
			return res.status(403).json({ status: "error", message: "You do not have permission to delete this reply or the reply does not exist" });
		}
		
		try {
			const socketInstance = req.app.get("socketInstance");
			if (socketInstance) {
				socketInstance.emitCoachingBoardReplyDeleted(id, commentId, replyId);
			}
		} catch (e) {
			console.warn("Socket notification deleteReply failed (non-fatal):", e?.message);
		}
		
		return res.status(200).json({ message: "Reply deleted successfully" });
	} catch (err) {
		console.error("deleteReply error", err);
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
	} catch (err) {
		console.error("addReply error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
	} catch (err) {
		console.error("saveDraft error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getMyDraft(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		const draft = await CoachingBoard.getMyDraft({ author: requesterId });
		if (!draft) return res.status(204).send();
		return res.status(200).json(draft);
	} catch (err) {
		console.error("getMyDraft error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
	} catch (err) {
		console.error("subscribeBoard error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getPendingNotifications(req, res) {
	try {
		const requesterId = getRequesterUserId(req);
		if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
		
		console.log("[getPendingNotifications] Fetching notifications for user:", requesterId);
		const notifications = await CoachingBoard.getPendingNotificationsForUser({ userId: requesterId });
		console.log("[getPendingNotifications] Found notifications:", notifications.length, notifications);
		
		for (const notif of notifications) {
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
		}
		
		console.log("[getPendingNotifications] Returning notifications:", notifications.length);
		return res.status(200).json({ notifications });
	} catch (err) {
		console.error("getPendingNotifications error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
	} catch (err) {
		console.error("markNotificationSeen error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
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
	} catch (err) {
		console.error("unsubscribeBoard error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}


