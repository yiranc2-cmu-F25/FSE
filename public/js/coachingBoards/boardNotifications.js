import { getSocket } from "../utils/socket.js";

let currentNotification = null;
let pendingNotificationsQueue = [];
let isShowingNotification = false;
let notificationListenerSetup = false;
let seenNotificationIds = new Set();

async function markNotificationSeen(boardId) {
	try {
		console.log("[boardNotifications] Marking notification as seen for boardId:", boardId);
		const res = await fetch(`/api/coaching-boards/${boardId}/notifications`, {
			method: "PATCH",
			credentials: "include"
		});
		if (!res.ok) {
			console.warn("[boardNotifications] Failed to mark notification as seen, status:", res.status);
		} else {
			console.log("[boardNotifications] Successfully marked notification as seen");
		}
	} catch (err) {
		console.warn("[boardNotifications] Failed to mark notification as seen:", err);
	}
}

function getNotificationId(notificationData) {
	if (!notificationData) {
		console.log("[boardNotifications] getNotificationId: no notificationData");
		return null;
	}

	let id = null;
	if (notificationData.type === "board_updated") {
		id = `board_updated_${notificationData.boardId}`;
	} else if (notificationData.type === "new_comment") {
		const commentId = String(notificationData.commentId || '');
		id = `new_comment_${notificationData.boardId}_${commentId}`;
	} else if (notificationData.type === "new_reply") {
		const commentId = String(notificationData.commentId || '');
		const replyId = String(notificationData.replyId || '');
		id = `new_reply_${notificationData.boardId}_${commentId}_${replyId}`;
	}
	console.log("[boardNotifications] getNotificationId result:", id, "for type:", notificationData.type);
	return id;
}

function showNotification(notificationData) {
	console.log("[boardNotifications] showNotification called with:", notificationData);
	const modal = document.getElementById("boardNotificationModal");
	const titleEl = document.getElementById("notificationTitle");

	console.log("[boardNotifications] Modal element:", modal, "Title element:", titleEl);
	if (!modal || !titleEl) {
		console.log("[boardNotifications] Modal or title element not found, returning");
		return;
	}
	
	const notificationId = getNotificationId(notificationData);
	console.log("[boardNotifications] Notification ID:", notificationId, "already in seenNotificationIds:", notificationId ? seenNotificationIds.has(notificationId) : false);
	if (notificationId && seenNotificationIds.has(notificationId)) {
		console.log("[boardNotifications] Notification already seen, skipping");
		return;
	}
	
	if (notificationData.type === "board_updated") {
		titleEl.textContent = `${notificationData.boardTitle || "Board"} updated.`;
		console.log("[boardNotifications] Setting title for board_updated:", titleEl.textContent);
	} else if (notificationData.type === "new_comment") {
		titleEl.textContent = `New Comment on ${notificationData.boardTitle || "Board"}`;
		console.log("[boardNotifications] Setting title for new_comment:", titleEl.textContent);
	} else if (notificationData.type === "new_reply") {
		titleEl.textContent = `${notificationData.authorName || "Someone"} replied to your comment.`;
		console.log("[boardNotifications] Setting title for new_reply:", titleEl.textContent);
	} else {
		console.log("[boardNotifications] Unknown notification type:", notificationData.type);
		return;
	}
	
	if (notificationId) {
		seenNotificationIds.add(notificationId);
		console.log("[boardNotifications] Added notification ID to seenNotificationIds:", notificationId);
	}
	
	currentNotification = notificationData;
	isShowingNotification = true;
	
	modal.classList.remove("hidden");
	console.log("[boardNotifications] Modal should now be visible");
	
}

async function hideNotification() {
	const modal = document.getElementById("boardNotificationModal");
	if (modal) {
		modal.classList.add("hidden");
	}
	
	if (currentNotification && currentNotification.boardId) {
		const notificationId = getNotificationId(currentNotification);
		if (notificationId) {
			seenNotificationIds.add(notificationId);
		}
		await markNotificationSeen(currentNotification.boardId);
	}
	
	currentNotification = null;
	isShowingNotification = false;
	
	await new Promise(resolve => setTimeout(resolve, 100));
	
	while (pendingNotificationsQueue.length > 0) {
		const nextNotification = pendingNotificationsQueue.shift();
		const nextId = getNotificationId(nextNotification);
		if (!nextId || !seenNotificationIds.has(nextId)) {
			setTimeout(() => showNotification(nextNotification), 300);
			return;
		}
	}
}

function setupNotificationHandlers() {
	const modal = document.getElementById("boardNotificationModal");
	const dismissBtn = document.getElementById("notificationDismissBtn");
	const viewBtn = document.getElementById("notificationViewBtn");
	
	if (!modal) return;
	
	dismissBtn?.addEventListener("click", async () => {
		await hideNotification();
	});
	
	viewBtn?.addEventListener("click", async () => {
		if (currentNotification && currentNotification.boardId) {
			const notificationId = getNotificationId(currentNotification);
			if (notificationId) {
				seenNotificationIds.add(notificationId);
			}
			
			await markNotificationSeen(currentNotification.boardId);
			
			let url = `/boards/${currentNotification.boardId}`;
			if (currentNotification.type === "new_comment" && currentNotification.commentId) {
				url += `?highlightComment=${encodeURIComponent(currentNotification.commentId)}`;
			} else if (currentNotification.type === "new_reply" && currentNotification.commentId) {
				url += `?highlightComment=${encodeURIComponent(currentNotification.commentId)}`;
				if (currentNotification.replyId) {
					url += `&highlightReply=${encodeURIComponent(currentNotification.replyId)}`;
				}
			}
			window.location.href = url;
		}
		await hideNotification();
	});
}

async function fetchPendingNotifications() {
	try {
		console.log("[boardNotifications] Fetching pending notifications...");
		const res = await fetch("/api/coaching-boards/notifications", {
			credentials: "include"
		});
		if (!res.ok) {
			console.log("[boardNotifications] Failed to fetch pending notifications, status:", res.status);
			return [];
		}
		
		const data = await res.json();
		console.log("[boardNotifications] Fetched notifications:", data.notifications?.length || 0, data.notifications);
		return data.notifications || [];
	} catch (err) {
		console.warn("[boardNotifications] Failed to fetch pending notifications:", err);
		return [];
	}
}

async function showPendingNotifications() {
	console.log("[boardNotifications] showPendingNotifications called");
	const notifications = await fetchPendingNotifications();
	console.log("[boardNotifications] Total notifications received:", notifications.length);
	if (notifications.length === 0) {
		console.log("[boardNotifications] No notifications to show");
		return;
	}
	
	const unseenNotifications = notifications.filter(notif => {
		const id = getNotificationId(notif);
		const isSeen = id && seenNotificationIds.has(id);
		console.log("[boardNotifications] Notification:", notif.type, "ID:", id, "isSeen:", isSeen, "boardId:", notif.boardId);
		return !id || !seenNotificationIds.has(id);
	});
	
	console.log("[boardNotifications] Unseen notifications:", unseenNotifications.length);
	if (unseenNotifications.length === 0) {
		console.log("[boardNotifications] All notifications already seen");
		return;
	}
	
	for (const notif of unseenNotifications) {
		const id = getNotificationId(notif);
		const alreadyInQueue = pendingNotificationsQueue.some(n => getNotificationId(n) === id);
		if (!alreadyInQueue) {
			pendingNotificationsQueue.push(notif);
		}
	}
	console.log("[boardNotifications] Added to queue, queue length:", pendingNotificationsQueue.length);
	
	if (!isShowingNotification && pendingNotificationsQueue.length > 0) {
		const firstNotification = pendingNotificationsQueue.shift();
		console.log("[boardNotifications] Showing first notification:", firstNotification);
		setTimeout(() => showNotification(firstNotification), 500);
	} else {
		console.log("[boardNotifications] Not showing notification - isShowingNotification:", isShowingNotification, "queue length:", pendingNotificationsQueue.length);
	}
}

export function initBoardNotifications() {
	const currentUserId = String(window.__CURRENT_USER_ID__ || "");
	console.log("[boardNotifications] initBoardNotifications called, currentUserId:", currentUserId);
	if (!currentUserId) {
		console.log("[boardNotifications] No currentUserId, returning");
		return;
	}
	
	setupNotificationHandlers();
	
	if (notificationListenerSetup) {
		console.log("[boardNotifications] Listener already setup, returning");
		return;
	}
	notificationListenerSetup = true;
	console.log("[boardNotifications] Setting up notification listener");
	
	showPendingNotifications();
	
	const socket = getSocket();
	console.log("[boardNotifications] Socket:", socket);
	
	socket.on("coaching_board_notification", (eventData) => {
		console.log("[boardNotifications] Received socket notification:", eventData);
		const notificationUserId = String(eventData.userId || "");
		console.log("[boardNotifications] Notification userId:", notificationUserId, "currentUserId:", currentUserId);
		if (notificationUserId !== currentUserId) {
			console.log("[boardNotifications] Notification not for current user, ignoring");
			return;
		}
		
		const notificationId = getNotificationId(eventData);
		console.log("[boardNotifications] Notification ID:", notificationId);
		if (notificationId && seenNotificationIds.has(notificationId)) {
			console.log("[boardNotifications] Notification already seen, ignoring");
			return;
		}
		

		if (isShowingNotification) {
			console.log("[boardNotifications] Already showing notification, checking if should add to queue");
			const alreadyInQueue = pendingNotificationsQueue.some(n => getNotificationId(n) === notificationId);
			if (!alreadyInQueue) {
				console.log("[boardNotifications] Adding to queue");
				pendingNotificationsQueue.push(eventData);
			} else {
				console.log("[boardNotifications] Already in queue, skipping");
			}
		} else {
			console.log("[boardNotifications] Not showing notification, calling showNotification");
			showNotification(eventData);
		}
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initBoardNotifications);
} else {
	initBoardNotifications();
}

