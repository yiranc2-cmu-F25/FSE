// utils/coachingBoard/socketHelpers.js
// Helper functions for socket emissions

import User from "../../entities/User.js";

/**
 * Get socket instance from request
 */
function getSocketInstance(req) {
  try {
    return req.app?.get("socketInstance");
  } catch {
    return null;
  }
}

/**
 * Emit coaching board comment
 */
export async function emitCoachingBoardComment(req, boardId, comment) {
  try {
    const socketInstance = getSocketInstance(req);
    if (!socketInstance || !comment) return;
    
    const requesterId = String(comment.author || "");
    const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
    comment.authorName = authorName || "Unknown";
    
    socketInstance.emitCoachingBoardComment(boardId, comment);
  } catch (err) {
    // Ignore error if socket emission fails
  }
}

/**
 * Emit coaching board reply
 */
export async function emitCoachingBoardReply(req, boardId, commentId, reply) {
  try {
    const socketInstance = getSocketInstance(req);
    if (!socketInstance || !reply) return;
    
    const requesterId = String(reply.author || "");
    const authorName = await User.getUsernameById(requesterId).catch(() => "Unknown");
    reply.authorName = authorName || "Unknown";
    
    socketInstance.emitCoachingBoardReply(boardId, commentId, reply);
  } catch (err) {
    // Ignore error if socket emission fails
  }
}

/**
 * Emit coaching board notification
 */
export async function emitCoachingBoardNotification(req, userIds, notification) {
  try {
    const socketInstance = getSocketInstance(req);
    if (!socketInstance || !userIds || userIds.length === 0) return;
    
    socketInstance.emitCoachingBoardNotification(userIds, notification);
  } catch (err) {
    // Ignore error if socket emission fails
  }
}

/**
 * Emit comment deleted notification
 */
export function emitCommentDeleted(req, boardId, commentId) {
  try {
    const socketInstance = getSocketInstance(req);
    if (!socketInstance) return;
    
    socketInstance.emitCoachingBoardCommentDeleted(boardId, commentId);
  } catch (err) {
    // Ignore error if socket emission fails
  }
}

/**
 * Emit reply deleted notification
 */
export function emitReplyDeleted(req, boardId, commentId, replyId) {
  try {
    const socketInstance = getSocketInstance(req);
    if (!socketInstance) return;
    
    socketInstance.emitCoachingBoardReplyDeleted(boardId, commentId, replyId);
  } catch (err) {
    // Ignore error if socket emission fails
  }
}

/**
 * Find newly created comment from board
 */
export function findNewComment(board, requesterId, commentText) {
  if (!board || !board.comments || !Array.isArray(board.comments)) return null;
  
  return board.comments.find(c => 
    String(c.author) === String(requesterId) && 
    c.comment === commentText &&
    Math.abs(new Date(c.timestamp).getTime() - Date.now()) < 5000
  );
}

/**
 * Find newly created reply from board
 */
export function findNewReply(board, commentId, requesterId, replyText) {
  if (!board || !board.comments || !Array.isArray(board.comments)) return null;
  
  const comment = board.comments.find(c => {
    const cId = c.id || c._id;
    return String(cId) === String(commentId);
  });
  
  if (!comment || !comment.replies || !Array.isArray(comment.replies)) return null;
  
  return comment.replies.find(r => 
    String(r.author) === String(requesterId) && 
    r.reply === replyText &&
    Math.abs(new Date(r.timestamp).getTime() - Date.now()) < 5000
  );
}

