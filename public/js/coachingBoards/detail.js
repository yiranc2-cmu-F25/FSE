import { showSubscriptionModal, shouldShowSubscriptionModal, showUnsubscriptionModal, shouldShowUnsubscriptionModal } from "./subscriptionModal.js";
import { getSocket } from "../utils/socket.js";
import { autoResizeTextarea, setupAutoResizeTextarea } from "../utils/autoResizeTextarea.js";
import { updateLikeButtonUI } from "../utils/likeButton.js";
import { setupCharCountListener, updateCharCount } from "../utils/charCount.js";

function badge(text) {
	const li = document.createElement("li");
	li.className = "inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800";
	li.textContent = text;
	return li;
}

async function fetchBoard() {
	const parts = window.location.pathname.split("/");
	const id = parts[parts.length - 1];
	const urlParams = new URLSearchParams(window.location.search);
	const highlightComment = urlParams.get("highlightComment");
	const highlightReply = urlParams.get("highlightReply");
	
	let url = `/api/coaching-boards/${id}`;
	const queryParams = [];
	if (highlightComment) {
		queryParams.push(`highlightComment=${encodeURIComponent(highlightComment)}`);
	}
	if (highlightReply) {
		queryParams.push(`highlightReply=${encodeURIComponent(highlightReply)}`);
	}
	if (queryParams.length > 0) {
		url += `?${queryParams.join("&")}`;
	}
	
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) return null;
	const data = await res.json();
	return data;
}

let commentRepliesState = {};
let renderCommentFn = null;
let renderRepliesFn = null;
let setupCommentEventListenersFn = null;
let setupReplyEventListenersFn = null;

function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}


function setSubscribeIcon(btn, subscribed) {
	btn.innerHTML = subscribed
		? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-7 w-7 fill-yellow-400 stroke-yellow-500"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.702.663.321.988l-4.203 3.573a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.984 20.51a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.203-3.572a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345l2.125-5.111Z"/></svg>`
		: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-7 w-7 fill-stone-300 stroke-stone-400"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.702.663.321.988l-4.203 3.573a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.984 20.51a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.203-3.572a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345l2.125-5.111Z"/></svg>`;
}

function render(board) {
	const currentUserId = String(window.__CURRENT_USER_ID__ || "");
	const boardAuthorId = String(board.author || "");
	const isAuthor = currentUserId === boardAuthorId;
	
	const editContainer = document.getElementById("editButtonContainer");
	const editButton = document.getElementById("editButton");
	if (editContainer && editButton) {
		if (isAuthor) {
			editContainer.classList.remove("hidden");
			editButton.href = `/boards/${board.id}/edit`;
		} else {
			editContainer.classList.add("hidden");
		}
	}
	
	document.getElementById("headerTitle").textContent = board.title;
	document.getElementById("headerCategory").textContent = board.category || "";
	document.getElementById("meta").textContent = `Last edited ${new Date(board.updatedAt).toLocaleString()}`;
	document.getElementById("description").textContent = board.description;
	document.getElementById("objective").textContent = board.objective;

	const subBtn = document.getElementById("headerSubscribeBtn");
	const isSub = (board.subscribers || []).includes(currentUserId);
	setSubscribeIcon(subBtn, isSub);
	subBtn.addEventListener("click", async () => {
		const url = `/api/coaching-boards/${board.id}/subscriptions`;
		const method = ((board.subscribers || []).includes(currentUserId)) ? "DELETE" : "POST";
		subBtn.disabled = true;
		const res = await fetch(url, { method, credentials: "include" });
		if (res.ok) {
			if (method === "POST") {
				board.subscribers = Array.from(new Set([...(board.subscribers || []), currentUserId]));
				if (shouldShowSubscriptionModal(currentUserId)) {
					showSubscriptionModal(currentUserId);
				}
			} else {
				board.subscribers = (board.subscribers || []).filter(id => id !== currentUserId);
				if (shouldShowUnsubscriptionModal(currentUserId)) {
					showUnsubscriptionModal(currentUserId);
				}
			}
			setSubscribeIcon(subBtn, (board.subscribers || []).includes(currentUserId));
		}
		subBtn.disabled = false;
	});

	document.getElementById("authorName").textContent = board.authorName || "Unknown";
	document.getElementById("meta").textContent = `Last edited ${new Date(board.updatedAt).toLocaleString()}`;

	setupShareButton(board.id);

	const steps = document.getElementById("steps");
	steps.innerHTML = "";
	(board.steps || []).forEach(s => {
		const li = document.createElement("li");
		li.textContent = s;
		steps.appendChild(li);
	});
	const skills = document.getElementById("skills");
	skills.innerHTML = "";
	(board.relatedSkills || []).forEach(s => skills.appendChild(badge(s)));
	const tools = document.getElementById("tools");
	tools.innerHTML = "";
	(board.tools || []).forEach(t => tools.appendChild(badge(t)));
	document.getElementById("notes").textContent = board.notes || "";

	function renderReplies(replies, commentId) {
		return replies.map(r => {
			const replyTime = r.timestamp ? new Date(r.timestamp).toLocaleString() : "";
			const replyAuthorName = escapeHtml(r.authorName || "Unknown");
			const replyText = escapeHtml(r.reply || "");
			const replyId = r.id || r._id;
			const replyAuthorId = String(r.author || "");
			const isReplyAuthor = currentUserId === replyAuthorId;
			const isReplyBoardAuthor = replyAuthorId === boardAuthorId;
			const replyLikes = r.likes || [];
			const replyLikeCount = replyLikes.length;
			const isReplyLiked = replyLikes.some(likeId => String(likeId) === currentUserId);
			
			return `
				<div class="py-1" data-reply-id="${replyId}">
					<div class="flex items-start justify-between mb-1">
						<div class="flex items-center gap-2">
						<p class="text-xs font-semibold text-gray-700">${replyAuthorName}</p>
							${isReplyBoardAuthor ? `<span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background-color: #F7E8E2; color: #C35F49;">Author</span>` : ""}
						</div>
						<p class="text-xs text-gray-500">${replyTime}</p>
					</div>
					<p class="text-xs text-gray-600">${replyText}</p>
					<div class="mt-1 flex items-center gap-2">
						<button class="reply-reply-btn inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900" data-username="${replyAuthorName}" data-reply-id="${replyId}" data-comment-id="${commentId}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
							</svg>
							Reply
						</button>
						${isReplyAuthor ? `
						<button class="reply-delete-btn inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-700" data-comment-id="${commentId}" data-reply-id="${replyId}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
								<path d="M3 6h18"></path>
								<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
								<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
							</svg>
							Delete
						</button>
						` : ""}
						<button class="reply-like-btn inline-flex items-center gap-1 text-xs ${isReplyLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}" data-comment-id="${commentId}" data-reply-id="${replyId}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isReplyLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
							</svg>
							<span class="like-count">${replyLikeCount}</span>
						</button>
					</div>
				</div>
			`;
		}).join("");
	}

	const boardId = board.id;
	
	setupAutoResizeTextarea("commentText", 160);
	setupCharCountListener("commentText", "charCount", 300, "number");

	let commentsSkip = (board.comments || []).length;
	let hasMoreComments = board.hasMoreComments || false;
	commentRepliesState = {};

	function renderComment(c) {
		const div = document.createElement("div");
		div.className = "rounded-md border border-gray-200 p-3";
		div.dataset.commentId = c.id || c._id;
		const commentTime = c.timestamp ? new Date(c.timestamp).toLocaleString() : "";
		const authorName = escapeHtml(c.authorName || "Unknown");
		const commentText = escapeHtml(c.comment || "");
		const commentId = c.id || c._id;
		const commentAuthorId = String(c.author || "");
		const isCommentAuthor = currentUserId === commentAuthorId;
		const isBoardAuthor = commentAuthorId === boardAuthorId;
		const likes = c.likes || [];
		const likeCount = likes.length;
		const isLiked = likes.some(likeId => String(likeId) === currentUserId);
		const totalReplies = c.totalReplies || (c.replies || []).length;
		const displayedReplies = c.replies || [];
		const hasMoreReplies = totalReplies > displayedReplies.length;
		
		if (!commentRepliesState[commentId]) {
			commentRepliesState[commentId] = {
				skip: displayedReplies.length,
				hasMore: hasMoreReplies
			};
		}
		
		div.innerHTML = `
			<div class="flex items-start justify-between mb-1">
				<div class="flex items-center gap-2">
				<p class="text-sm font-semibold text-gray-900">${authorName}</p>
					${isBoardAuthor ? `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style="background-color: #F7E8E2; color: #C35F49;">Author</span>` : ""}
				</div>
				<p class="text-xs text-gray-500">${commentTime}</p>
			</div>
			<p class="text-sm text-gray-800">${commentText}</p>
			<div class="mt-2 flex items-center gap-3">
				<button class="comment-reply-btn inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900" data-comment-id="${commentId}" data-username="${authorName}">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
					</svg>
					Reply
				</button>
				${isCommentAuthor ? `
				<button class="comment-delete-btn inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-700" data-comment-id="${commentId}">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
						<path d="M3 6h18"></path>
						<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
						<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
					</svg>
					Delete
				</button>
				` : ""}
				<button class="comment-like-btn inline-flex items-center gap-1 text-xs ${isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}" data-comment-id="${commentId}">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
						<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
					</svg>
					<span class="like-count">${likeCount}</span>
				</button>
			</div>
			${displayedReplies.length > 0 ? `
			<div class="mt-2 pl-4 border-l space-y-2" data-replies-container="${commentId}">
				${renderReplies(displayedReplies, commentId)}
			</div>
			` : ""}
			${hasMoreReplies ? `
			<div class="mt-2">
				<button class="view-more-replies-btn text-xs text-gray-600 hover:text-gray-800" data-comment-id="${commentId}">
					View More
				</button>
			</div>
			` : ""}
		`;
		return div;
	}

	const comments = document.getElementById("comments");
	comments.innerHTML = "";
	(board.comments || []).forEach(c => {
		comments.appendChild(renderComment(c));
	});
	
	const urlParams = new URLSearchParams(window.location.search);
	const highlightCommentId = urlParams.get("highlightComment");
	const highlightReplyId = urlParams.get("highlightReply");
	
	if (highlightCommentId) {
		const tryHighlight = () => {
			const commentElement = document.querySelector(`[data-comment-id="${highlightCommentId}"]`);
			if (commentElement) {
				if (highlightReplyId) {
					const replyElement = commentElement.querySelector(`[data-reply-id="${highlightReplyId}"]`);
					if (replyElement) {
						replyElement.scrollIntoView({ behavior: "smooth", block: "center" });
						replyElement.style.backgroundColor = "#fef3c7";
						setTimeout(() => {
							replyElement.style.backgroundColor = "";
						}, 2000);
						return true;
					}
				} else {
					commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
					commentElement.style.backgroundColor = "#fef3c7";
					setTimeout(() => {
						commentElement.style.backgroundColor = "";
					}, 2000);
					return true;
				}
			}
			return false;
		};
		
		if (!tryHighlight()) {
			setTimeout(() => {
				if (!tryHighlight()) {
					setTimeout(tryHighlight, 500);
				}
			}, 100);
		}
	}
	
	if (hasMoreComments) {
		const viewMoreDiv = document.createElement("div");
		viewMoreDiv.className = "mt-4 text-center";
		viewMoreDiv.innerHTML = `
			<button id="viewMoreCommentsBtn" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
				View More Comments
			</button>
		`;
		comments.appendChild(viewMoreDiv);
	}

	const deleteModal = document.getElementById("deleteConfirmModal");
	const deleteCancelBtn = document.getElementById("deleteCancelBtn");
	const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
	const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");
	
	let pendingDeleteAction = null;
	
	function showDeleteModal(message, onConfirm) {
		if (!deleteModal || !deleteConfirmMessage) return;
		deleteConfirmMessage.textContent = message;
		pendingDeleteAction = onConfirm;
		deleteModal.classList.remove("hidden");
		deleteModal.classList.add("flex");
		deleteModal.setAttribute("aria-hidden", "false");
	}
	
	function hideDeleteModal() {
		if (!deleteModal) return;
		deleteModal.classList.add("hidden");
		deleteModal.classList.remove("flex");
		deleteModal.setAttribute("aria-hidden", "true");
		pendingDeleteAction = null;
	}
	
	deleteCancelBtn?.addEventListener("click", () => {
		hideDeleteModal();
	});
	
	deleteConfirmBtn?.addEventListener("click", async () => {
		if (pendingDeleteAction) {
			await pendingDeleteAction();
		}
		hideDeleteModal();
	});
	
	if (deleteModal) {
		deleteModal.addEventListener("click", (e) => {
			if (e.target === deleteModal) {
			hideDeleteModal();
			}
		});
	}

	async function handleViewMoreComments(btn) {
		btn.disabled = true;
		btn.textContent = "Loading...";
		try {
			const res = await fetch(`/api/coaching-boards/${boardId}/comments?skip=${commentsSkip}&limit=10`, {
				credentials: "include"
			});
			if (res.ok) {
				const data = await res.json();
				const commentsContainer = document.getElementById("comments");
				
				btn.parentElement?.remove();
				
				data.comments.forEach(c => {
					commentsContainer.appendChild(renderComment(c));
				});

				commentsSkip += data.comments.length;
				hasMoreComments = data.hasMore;

				setupCommentEventListeners();
				
				data.comments.forEach(c => {
					if (c.replies && c.replies.length > 0) {
						setupReplyEventListeners(c.id || c._id);
					}
				});

				if (hasMoreComments) {
					const viewMoreDiv = document.createElement("div");
					viewMoreDiv.className = "mt-4 text-center";
					viewMoreDiv.innerHTML = `
						<button id="viewMoreCommentsBtn" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
							View More Comments
						</button>
					`;
					commentsContainer.appendChild(viewMoreDiv);
					
					const newBtn = document.getElementById("viewMoreCommentsBtn");
					if (newBtn) {
						newBtn.addEventListener("click", () => handleViewMoreComments(newBtn));
					}
				}
			} else {
				alert("Failed to load more comments");
				btn.disabled = false;
				btn.textContent = "View More Comments";
			}
		} catch (err) {
			console.error("Error loading more comments:", err);
			alert("Failed to load more comments");
			btn.disabled = false;
			btn.textContent = "View More Comments";
		}
	}

	const viewMoreCommentsBtn = document.getElementById("viewMoreCommentsBtn");
	if (viewMoreCommentsBtn) {
		viewMoreCommentsBtn.addEventListener("click", () => handleViewMoreComments(viewMoreCommentsBtn));
	}

	document.querySelectorAll(".view-more-replies-btn").forEach(btn => {
		btn.addEventListener("click", async () => {
			const commentId = btn.dataset.commentId;
			const state = commentRepliesState[commentId];
			if (!state || !state.hasMore) return;
			
			btn.disabled = true;
			btn.textContent = "Loading...";
			try {
				const res = await fetch(`/api/coaching-boards/${boardId}/comments/${commentId}/replies?skip=${state.skip}&limit=10`, {
					credentials: "include"
				});
				if (res.ok) {
					const data = await res.json();
					const repliesContainer = document.querySelector(`[data-replies-container="${commentId}"]`);
					if (repliesContainer) {
						const newRepliesHtml = renderReplies(data.replies, commentId);
						repliesContainer.insertAdjacentHTML("beforeend", newRepliesHtml);

						setupReplyEventListeners(commentId);
					}

					state.skip += data.replies.length;
					state.hasMore = data.hasMore;
					if (state.hasMore) {
						btn.disabled = false;
						btn.textContent = "View More";
					} else {
						btn.remove();
					}
				} else {
					alert("Failed to load more replies");
					btn.disabled = false;
					btn.textContent = "View More";
				}
			} catch (err) {
				console.error("Error loading more replies:", err);
				alert("Failed to load more replies");
				btn.disabled = false;
				btn.textContent = "View More";
			}
		});
	});

	renderCommentFn = renderComment;
	renderRepliesFn = renderReplies;
	setupCommentEventListenersFn = setupCommentEventListeners;
	setupReplyEventListenersFn = setupReplyEventListeners;

	function setupDeleteHandler(deleteUrl, selector, confirmMessage, errorMessage) {
		showDeleteModal(confirmMessage, async () => {
			const res = await fetch(deleteUrl, {
				method: "DELETE",
				credentials: "include"
			});
			if (res.ok) {
				const element = document.querySelector(selector);
				if (element) {
					element.remove();
				}
			} else {
				const err = await res.json().catch(() => ({}));
				alert(err?.message || errorMessage);
			}
		});
	}

	async function updateLikeButtonAfterToggle(commentId, replyId, likeCountSpan, btn, svg, currentUserId) {
		const boardRes = await fetch(`/api/coaching-boards/${boardId}`, { credentials: "include" });
		if (!boardRes.ok) return;
		
		const updatedBoard = await boardRes.json();
		if (replyId) {
			const comment = (updatedBoard.comments || []).find(c => {
				const cId = c.id || c._id;
				return String(cId) === String(commentId);
			});
			if (comment) {
				const updatedReply = (comment.replies || []).find(r => {
					const rId = r.id || r._id;
					return String(rId) === String(replyId);
				});
				if (updatedReply) {
					const likes = updatedReply.likes || [];
					updateLikeButtonUI(likes, currentUserId, likeCountSpan, btn, svg);
				} else {
					console.warn("Reply not found after like toggle:", { replyId, commentId, replies: comment.replies });
				}
			} else {
				console.warn("Comment not found after like toggle:", { commentId, comments: updatedBoard.comments });
			}
		} else {
			const updatedComment = (updatedBoard.comments || []).find(c => {
				const cId = c.id || c._id;
				return String(cId) === String(commentId);
			});
			if (updatedComment) {
				const likes = updatedComment.likes || [];
				updateLikeButtonUI(likes, currentUserId, likeCountSpan, btn, svg);
			}
		}
	}

	function setupCommentEventListeners() {
		const commentInput = document.getElementById("commentText");
		if (!commentInput) {
			console.error("[detail.js] commentText element not found");
			return;
		}
		
		document.querySelectorAll(".comment-reply-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const username = btn.dataset.username;
				const commentId = btn.dataset.commentId;
				commentInput.value = `@${username}: `;
				commentInput.dataset.targetId = commentId;
				console.log("[detail.js] Reply to comment clicked:", { username, commentId });
				commentInput.focus();
			});
		});

		document.querySelectorAll(".comment-like-btn").forEach(btn => {
			btn.addEventListener("click", async () => {
				const commentId = btn.dataset.commentId;
				const likeCountSpan = btn.querySelector(".like-count");
				const svg = btn.querySelector("svg");
				
				const currentCount = parseInt(likeCountSpan.textContent) || 0;
				const isCurrentlyLiked = btn.classList.contains("text-red-600");
				
				const res = await fetch(`/api/coaching-boards/${boardId}/comments/${commentId}/likes`, {
					method: "POST",
					credentials: "include"
				});
				
				if (res.ok) {
					await updateLikeButtonAfterToggle(commentId, null, likeCountSpan, btn, svg, currentUserId);
				}
			});
		});

		document.querySelectorAll(".comment-delete-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const commentId = btn.dataset.commentId;
				setupDeleteHandler(
					`/api/coaching-boards/${boardId}/comments/${commentId}`,
					`[data-comment-id="${commentId}"]`,
					"Are you sure you want to delete this comment? All replies to this comment will also be deleted.",
					"Failed to delete comment"
				);
			});
		});
	}

	function setupReplyEventListeners(commentId) {
		const repliesContainer = document.querySelector(`[data-replies-container="${commentId}"]`);
		if (!repliesContainer) return;
		const currentUserId = String(window.__CURRENT_USER_ID__ || "");

		const commentInput = document.getElementById("commentText");
		if (!commentInput) {
			console.error("[detail.js] commentText element not found");
			return;
		}
		
		repliesContainer.querySelectorAll(".reply-reply-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const username = btn.dataset.username;
				const replyId = btn.dataset.replyId;
				const commentId = btn.dataset.commentId;
				commentInput.value = `@${username}: `;
				if (replyId) {
					commentInput.dataset.targetId = `reply:${replyId}`;
					console.log("[detail.js] Reply to reply clicked:", { username, replyId });
				} else if (commentId) {
					commentInput.dataset.targetId = commentId;
					console.log("[detail.js] Reply to comment clicked (from reply button):", { username, commentId });
				} else {
					delete commentInput.dataset.targetId;
				}
				commentInput.focus();
			});
		});

		repliesContainer.querySelectorAll(".reply-like-btn").forEach(btn => {
			btn.addEventListener("click", async () => {
				const replyCommentId = btn.dataset.commentId;
				const replyId = btn.dataset.replyId;
				const likeCountSpan = btn.querySelector(".like-count");
				const svg = btn.querySelector("svg");
				
				const res = await fetch(`/api/coaching-boards/${boardId}/comments/${replyCommentId}/replies/${replyId}/likes`, {
					method: "POST",
					credentials: "include"
				});
				
				if (res.ok) {
					await updateLikeButtonAfterToggle(replyCommentId, replyId, likeCountSpan, btn, svg, currentUserId);
				}
			});
		});

		repliesContainer.querySelectorAll(".reply-delete-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const replyCommentId = btn.dataset.commentId;
				const replyId = btn.dataset.replyId;
				setupDeleteHandler(
					`/api/coaching-boards/${boardId}/comments/${replyCommentId}/replies/${replyId}`,
					`[data-reply-id="${replyId}"]`,
					"Are you sure you want to delete this reply? All replies to this reply will also be deleted.",
					"Failed to delete reply"
				);
			});
		});
	}

	setupCommentEventListeners();
	(board.comments || []).forEach(c => {
		if (c.replies && c.replies.length > 0) {
			setupReplyEventListeners(c.id || c._id);
		}
	});
}

function setupShareButton(boardId) {
	const shareBtn = document.getElementById("headerShareBtn");
	const sendToUserModal = document.getElementById("sendToUserModal");
	const sendToUserCloseBtn = document.getElementById("sendToUserCloseBtn");
	const sendToUserCopyLinkBtn = document.getElementById("sendToUserCopyLinkBtn");
	const userSearchInput = document.getElementById("userSearchInput");
	const userList = document.getElementById("userList");

	if (!shareBtn || !sendToUserModal) return;

	let allUsers = [];
	let filteredUsers = [];

	shareBtn.addEventListener("click", async () => {
		sendToUserModal.classList.remove("hidden");
		sendToUserModal.classList.add("flex");
		sendToUserModal.setAttribute("aria-hidden", "false");
		
		try {
			const res = await fetch("/api/authentications/lists", { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				allUsers = [...(data.onlineUsers || []), ...(data.offlineUsers || [])];
				filteredUsers = allUsers;
				renderUserList();
			}
		} catch (err) {
			console.error("Failed to load users:", err);
		}
	});

	const closeSendToUserModal = () => {
		sendToUserModal.classList.add("hidden");
		sendToUserModal.classList.remove("flex");
		sendToUserModal.setAttribute("aria-hidden", "true");
		userSearchInput.value = "";
		filteredUsers = allUsers;
		renderUserList();
	};

	sendToUserCloseBtn?.addEventListener("click", closeSendToUserModal);

	sendToUserModal.addEventListener("click", (e) => {
		if (e.target === sendToUserModal || e.target.classList.contains("bg-white/30")) {
			closeSendToUserModal();
		}
	});

	sendToUserCopyLinkBtn?.addEventListener("click", async () => {
		const boardUrl = `${window.location.origin}/boards/${boardId}`;
		try {
			await navigator.clipboard.writeText(boardUrl);
			const originalHTML = sendToUserCopyLinkBtn.innerHTML;
			sendToUserCopyLinkBtn.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				Copied!
			`;
			sendToUserCopyLinkBtn.classList.add("bg-green-50", "text-green-700");
			setTimeout(() => {
				sendToUserCopyLinkBtn.innerHTML = originalHTML;
				sendToUserCopyLinkBtn.classList.remove("bg-green-50", "text-green-700");
			}, 2000);
		} catch (err) {
			console.error("Failed to copy link:", err);
			alert("Failed to copy link. Please try again.");
		}
	});

	userSearchInput?.addEventListener("input", (e) => {
		const query = e.target.value.toLowerCase().trim();
		if (!query) {
			filteredUsers = allUsers;
		} else {
			filteredUsers = allUsers.filter(user => 
				(user.name || "").toLowerCase().includes(query)
			);
		}
		renderUserList();
	});

	function renderUserList() {
		if (!userList) return;
		const currentUserId = String(window.__CURRENT_USER_ID__ || "");
		userList.innerHTML = "";
		
		if (filteredUsers.length === 0) {
			userList.innerHTML = '<p class="text-sm text-stone-500 text-center py-4">No users found</p>';
			return;
		}

		filteredUsers.forEach(user => {
			if (String(user.id) === currentUserId) return;
			
			const userItem = document.createElement("div");
			userItem.className = "flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-stone-50 cursor-pointer";
			userItem.innerHTML = `
				<div class="flex items-center gap-3">
					<div class="grid h-10 w-10 place-content-center rounded-full text-xs font-bold text-white" style="background-color: ${getAvatarColor(user.name || "")}">
						${getInitialsSafe(user.name || "")}
					</div>
					<div>
						<p class="text-sm font-semibold text-stone-900">${escapeHtml(user.name || "Unknown")}</p>
						<p class="text-xs text-stone-500">${user.status || "UNDEFINED"}</p>
					</div>
				</div>
			`;
			userItem.addEventListener("click", async () => {
				await sendBoardToUser(user.id, user.name, boardId);
				closeSendToUserModal();
			});
			userList.appendChild(userItem);
		});
	}

	async function sendBoardToUser(userId, userName, boardId) {
		const boardUrl = `${window.location.origin}/boards/${boardId}`;
		const message = `Check out this coaching board: ${boardUrl}`;
		
		try {
			const currentUser = await fetch("/api/authentications/accounts", { credentials: "include" });
			if (!currentUser.ok) throw new Error("Failed to get current user");
			const userData = await currentUser.json();
			const status = userData.sharedstatus || "OK";
			
			const res = await fetch("/api/messages/private", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					receiver: String(userId),
					content: message,
					status: status,
					timestamp: new Date().toISOString()
				})
			});

			if (res.ok) {
				const successModal = document.createElement("div");
				successModal.className = "fixed top-0 left-0 right-0 bottom-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm";
				successModal.innerHTML = `
					<div class="rounded-3xl bg-white p-8 shadow-2xl text-center w-80 animate-fade-in">
						<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white">
							<svg class="h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<h2 class="text-lg font-bold text-stone-800 mb-2">Message Sent!</h2>
						<p class="text-stone-500 text-xs mb-6">The board link has been sent to ${escapeHtml(userName || "the user")}.</p>
						<button class="w-full rounded-2xl bg-[#C35F49] shadow hover:brightness-95 px-6 py-3 text-sm text-white font-semibold">OK</button>
					</div>
				`;
				document.body.appendChild(successModal);
				successModal.querySelector("button").addEventListener("click", () => {
					successModal.remove();
				});
				successModal.addEventListener("click", (e) => {
					if (e.target === successModal) {
						successModal.remove();
					}
				});
			} else {
				throw new Error("Failed to send message");
			}
		} catch (err) {
			console.error("Failed to send board to user:", err);
			alert("Failed to send message. Please try again.");
		}
	}

	function getAvatarColor(name) {
		const colors = [
			"#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
			"#EC4899", "#06B6D4", "#F97316", "#84CC16", "#6366F1"
		];
		if (!name) return colors[0];
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}

	function getInitialsSafe(name) {
		if (!name) return "?";
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	}
}

(async function init() {
	const data = await fetchBoard();
	if (!data) {
		alert("Board not found");
		return;
	}
	render(data);
	const boardId = data.id;
	const currentUserId = String(window.__CURRENT_USER_ID__ || "");
	
	document.getElementById("commentForm").addEventListener("submit", async (e) => {
		e.preventDefault();
		const txt = document.getElementById("commentText");
		let commentText = txt.value.trim();
		if (!commentText) return;
		
		const originalText = commentText;
		let isReply = false;
		let replyUsername = null;
		let storedTargetId = null;
		
		const targetId = txt.dataset.targetId;
		if (targetId) {
			const match = commentText.match(/^@([^:]+):\s*(.+)$/);
			if (match) {
				const [, username, text] = match;
				commentText = `@${username}#${targetId}: ${text}`;
				isReply = true;
				replyUsername = username;
				storedTargetId = targetId;
				console.log("[detail.js] Reply with target ID:", { username, targetId, finalText: commentText });
			} else {
				console.warn("[detail.js] Target ID exists but text doesn't match reply pattern:", commentText);
			}
			delete txt.dataset.targetId;
		} else {
			const match = commentText.match(/^@([^:]+):\s*(.+)$/);
			if (match) {
				isReply = true;
				replyUsername = match[1];
			}
		}
		
		const res = await fetch(`/api/coaching-boards/${boardId}/comments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ comment: commentText })
		});
		
		if (res.ok) {
			txt.value = "";
			delete txt.dataset.targetId;
			autoResizeTextarea(txt, 160);
			updateCharCount("commentText", "charCount", 300, "number");
			
			if (isReply && storedTargetId) {
				const isReplyToReply = storedTargetId.startsWith("reply:");
				const targetReplyId = isReplyToReply ? storedTargetId.replace("reply:", "") : null;
				
				let commentElement = null;
				if (isReplyToReply) {
					const targetReplyElement = document.querySelector(`[data-reply-id="${targetReplyId}"]`);
					if (targetReplyElement) {
						commentElement = targetReplyElement.closest('[data-comment-id]');
					}
				}
				
				const boardRes = await fetch(`/api/coaching-boards/${boardId}`, { credentials: "include" });
				if (!boardRes.ok) {
					return;
				}
				
				const updatedBoard = await boardRes.json();
				
				let targetComment = null;
				if (isReplyToReply) {
					let commentId = null;
					if (commentElement) {
						commentId = commentElement.getAttribute("data-comment-id");
					}
					
					if (commentId) {
						for (const c of updatedBoard.comments || []) {
							if (String(c.id || c._id) === commentId) {
								targetComment = c;
								break;
							}
						}
						
						if (!targetComment) {
							const commentRes = await fetch(`/api/coaching-boards/${boardId}?cid=${commentId}`, { credentials: "include" });
							if (commentRes.ok) {
								const commentData = await commentRes.json();
								if (commentData.comments && commentData.comments.length > 0) {
									targetComment = commentData.comments[0];
								}
							}
						}
					} else {
						for (const c of updatedBoard.comments || []) {
							if ((c.replies || []).some(r => String(r.id || r._id) === targetReplyId)) {
								targetComment = c;
								break;
							}
						}
					}
				} else {
					targetComment = (updatedBoard.comments || []).find(c => String(c.id || c._id) === storedTargetId);
				}
				
				if (!targetComment || !renderRepliesFn || !setupReplyEventListenersFn) return;
				
				const now = Date.now();
				
				(targetComment.replies || []).forEach((r, index) => {
					const replyTime = new Date(r.timestamp).getTime();
					const timeDiff = Math.abs(replyTime - now);
					const authorMatch = String(r.author) === currentUserId;
				});
				
				let newReply = (targetComment.replies || []).find(r => {
					const timeDiff = Math.abs(new Date(r.timestamp).getTime() - now);
					return String(r.author) === currentUserId && timeDiff < 10000;
				});
				
				if (!newReply) {
					newReply = (targetComment.replies || []).find(r => {
						const timeDiff = Math.abs(new Date(r.timestamp).getTime() - now);
						return String(r.author) === currentUserId && timeDiff < 30000;
					});
					if (!newReply) {
						const userReplies = (targetComment.replies || []).filter(r => String(r.author) === currentUserId);
						if (userReplies.length > 0) {
							userReplies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
							newReply = userReplies[0];
						} else {
							return;
						}
					}
				}
				const authorNameRes = await fetch(`/api/users/${newReply.author}`, { credentials: "include" });
				if (authorNameRes.ok) {
					const authorData = await authorNameRes.json();
					newReply.authorName = authorData.username || "Unknown";
				}

				if (!commentElement) {
					commentElement = document.querySelector(`[data-comment-id="${targetComment.id}"]`);
				}
				if (!commentElement) return;
				
				const actionsDiv = commentElement.querySelector(".mt-2.flex.items-center.gap-3");
				if (!actionsDiv) {
					return;
				}
				
				let repliesContainer = commentElement.querySelector(`[data-replies-container="${targetComment.id}"]`);
				
				if (!repliesContainer) {
					const repliesDiv = document.createElement("div");
					repliesDiv.className = "mt-2 pl-4 border-l space-y-2";
					repliesDiv.setAttribute("data-replies-container", targetComment.id);
					actionsDiv.after(repliesDiv);
					repliesContainer = repliesDiv;
				}
				
				// Check if reply already exists to avoid duplicates
				const replyId = newReply.id || newReply._id;
				if (repliesContainer) {
					const existingReply = repliesContainer.querySelector(`[data-reply-id="${replyId}"]`);
					if (existingReply) {
						console.log("[detail.js] Reply already exists, skipping local add:", replyId);
						return;
					}
				}
				
				const newReplyHtml = renderRepliesFn([newReply], targetComment.id);
				const tempDiv = document.createElement("div");
				tempDiv.innerHTML = newReplyHtml.trim();
				const newReplyElement = tempDiv.firstElementChild;
				if (!newReplyElement) return;
				
				// Check if this is a reply to another reply
				if (isReplyToReply && targetReplyId) {
					const targetReplyElement = repliesContainer.querySelector(`[data-reply-id="${targetReplyId}"]`);
					if (targetReplyElement) {
						// Insert after the target reply
						targetReplyElement.insertAdjacentElement("afterend", newReplyElement);
					} else {
						// Target reply not found, insert at the beginning
						repliesContainer.insertBefore(newReplyElement, repliesContainer.firstChild);
					}
				} else {
					// Not a reply to another reply, insert at the beginning (first reply under comment)
					repliesContainer.insertBefore(newReplyElement, repliesContainer.firstChild);
				}
				
				setupReplyEventListenersFn(targetComment.id);
				
				setTimeout(() => {
					newReplyElement.scrollIntoView({ behavior: "smooth", block: "center" });
					newReplyElement.style.backgroundColor = "#fef3c7";
					setTimeout(() => {
						newReplyElement.style.backgroundColor = "";
					}, 2000);
				}, 100);
				return;
			} else {
				const boardRes = await fetch(`/api/coaching-boards/${boardId}`, { credentials: "include" });
				if (boardRes.ok) {
					const updatedBoard = await boardRes.json();
					const newComment = (updatedBoard.comments || []).find(c => {
						return String(c.author) === currentUserId &&
							   new Date(c.timestamp).getTime() > Date.now() - 5000;
					});
					
					if (newComment) {
						const authorNameRes = await fetch(`/api/users/${newComment.author}`, { credentials: "include" });
						if (authorNameRes.ok) {
							const authorData = await authorNameRes.json();
							newComment.authorName = authorData.username || "Unknown";
						}
						
						const commentsContainer = document.getElementById("comments");
						if (renderCommentFn && setupCommentEventListenersFn && setupReplyEventListenersFn) {
							const newCommentElement = renderCommentFn(newComment);
							commentsContainer.insertBefore(newCommentElement, commentsContainer.firstChild);
							
							setupCommentEventListenersFn();
							if (newComment.replies && newComment.replies.length > 0) {
								setupReplyEventListenersFn(newComment.id || newComment._id);
							}
							
							setTimeout(() => {
								newCommentElement.scrollIntoView({ behavior: "smooth", block: "center" });
								newCommentElement.style.backgroundColor = "#fef3c7";
								setTimeout(() => {
									newCommentElement.style.backgroundColor = "";
								}, 2000);
							}, 100);
						}
					}
				}
			}
		} else {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || "Failed to add comment");
		}
	});

	const currentBoardId = data.id;
	setTimeout(() => {
		const socket = getSocket();
	
	socket.on("coaching_board_comment", async (eventData) => {
		if (eventData.boardId !== currentBoardId) return;
		
		const newComment = eventData.comment;
		if (!newComment) return;
		
		const existingComment = document.querySelector(`[data-comment-id="${newComment.id || newComment._id}"]`);
		if (existingComment) return;
		
		if (String(newComment.author) === currentUserId) return;
		
		if (!newComment.authorName) {
			const authorNameRes = await fetch(`/api/users/${newComment.author}`, { credentials: "include" });
			if (authorNameRes.ok) {
				const authorData = await authorNameRes.json();
				newComment.authorName = authorData.username || "Unknown";
			}
		}
		
		const commentsContainer = document.getElementById("comments");
		if (commentsContainer && renderCommentFn && setupCommentEventListenersFn && setupReplyEventListenersFn) {
			const newCommentElement = renderCommentFn(newComment);
			commentsContainer.insertBefore(newCommentElement, commentsContainer.firstChild);
			
			setupCommentEventListenersFn();
			if (newComment.replies && newComment.replies.length > 0) {
				setupReplyEventListenersFn(newComment.id || newComment._id);
			}
		}
	});
	
	socket.on("coaching_board_reply", async (eventData) => {
		if (eventData.boardId !== currentBoardId) return;
		
		const newReply = eventData.reply;
		const commentId = String(eventData.commentId || "");
		if (!newReply || !commentId) return;
		
		// Find comment element by matching ID (support both id and _id formats)
		const commentElement = Array.from(document.querySelectorAll("[data-comment-id]")).find(el => {
			const elCommentId = el.getAttribute("data-comment-id");
			return String(elCommentId) === commentId;
		});
		if (!commentElement) {
			console.log("[detail.js] Comment not found for reply socket event, commentId:", commentId);
			return;
		}
		
		const repliesContainer = commentElement.querySelector(`[data-replies-container="${commentId}"]`);
		if (repliesContainer) {
			const replyId = newReply.id || newReply._id;
			const existingReply = repliesContainer.querySelector(`[data-reply-id="${replyId}"]`);
			if (existingReply) {
				console.log("[detail.js] Reply already exists in socket event, skipping:", replyId);
				return;
			}
		}
		
		if (!newReply.authorName) {
			const authorNameRes = await fetch(`/api/users/${newReply.author}`, { credentials: "include" });
			if (authorNameRes.ok) {
				const authorData = await authorNameRes.json();
				newReply.authorName = authorData.username || "Unknown";
			}
		}
		
		if (renderRepliesFn && setupReplyEventListenersFn) {
			let repliesContainer = commentElement.querySelector(`[data-replies-container="${commentId}"]`);
			if (!repliesContainer) {
				const repliesDiv = document.createElement("div");
				repliesDiv.className = "mt-2 pl-4 border-l space-y-2";
				repliesDiv.setAttribute("data-replies-container", commentId);
				const actionsDiv = commentElement.querySelector(".mt-2.flex.items-center.gap-3");
				if (actionsDiv) {
					actionsDiv.after(repliesDiv);
				}
				repliesContainer = repliesDiv;
			}
			
			const newReplyHtml = renderRepliesFn([newReply], commentId);
			const tempDiv = document.createElement("div");
			tempDiv.innerHTML = newReplyHtml.trim();
			const newReplyElement = tempDiv.firstElementChild;
			if (!newReplyElement) return;
			
			// Check if this is a reply to another reply
			const replyToId = newReply.replyTo;
			if (replyToId) {
				const targetReplyElement = repliesContainer.querySelector(`[data-reply-id="${replyToId}"]`);
				if (targetReplyElement) {
					// Insert after the target reply
					targetReplyElement.insertAdjacentElement("afterend", newReplyElement);
				} else {
					// Target reply not found, insert at the beginning
					repliesContainer.insertBefore(newReplyElement, repliesContainer.firstChild);
				}
			} else {
				// Not a reply to another reply, insert at the beginning (first reply under comment)
				repliesContainer.insertBefore(newReplyElement, repliesContainer.firstChild);
			}
			
			setupReplyEventListenersFn(commentId);
			
			// Scroll and highlight the new reply
			setTimeout(() => {
				newReplyElement.scrollIntoView({ behavior: "smooth", block: "center" });
				newReplyElement.style.backgroundColor = "#fef3c7";
				setTimeout(() => {
					newReplyElement.style.backgroundColor = "";
				}, 2000);
			}, 100);
			
			if (!commentRepliesState[commentId]) {
				commentRepliesState[commentId] = { skip: 0, hasMore: false };
			}
			commentRepliesState[commentId].skip += 1;
			
			const viewMoreBtn = commentElement.querySelector(".view-more-replies-btn");
			const displayedCount = repliesContainer.querySelectorAll("[data-reply-id]").length;
			if (displayedCount > 1 && !viewMoreBtn) {
				commentRepliesState[commentId].hasMore = true;
			}
		}
	});
	
	socket.on("coaching_board_comment_deleted", (eventData) => {
		if (eventData.boardId !== currentBoardId) return;
		
		const commentId = eventData.commentId;
		if (!commentId) return;
		
		const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
		if (commentElement) {
			commentElement.remove();
		}
	});
	
	socket.on("coaching_board_reply_deleted", (eventData) => {
		if (eventData.boardId !== currentBoardId) return;
		
		const commentId = eventData.commentId;
		const replyId = eventData.replyId;
		if (!commentId || !replyId) return;
		
		const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
		if (!commentElement) return;
		
		const replyElement = commentElement.querySelector(`[data-reply-id="${replyId}"]`);
		if (replyElement) {
			replyElement.remove();
		}
	});
	}, 100);
})(); 


