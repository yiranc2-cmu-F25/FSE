// utils/coachingBoard/replyHelpers.js
// Helper functions for reply parsing and target finding

import User from "../../entities/User.js";

/**
 * Parse reply format: @username#targetId: text or @username: text
 */
export function parseReplyFormat(comment) {
  const replyMatch = comment.match(/^@([^#:]+)(?:#(reply:[^:]+|[^:]+))?:\s*(.+)$/);
  if (!replyMatch) return null;
  
  const [, username, targetId, replyText] = replyMatch;
  return { username, targetId, replyText };
}

/**
 * Find target reply by ID
 */
export function findTargetReplyById(board, replyId) {
  if (!board || !board.comments || !Array.isArray(board.comments)) {
    return { targetReply: null, targetComment: null };
  }
  
  for (const comment of board.comments) {
    const reply = (comment.replies || []).find(r => {
      const rId = String(r.id || r._id);
      return rId === replyId;
    });
    if (reply) {
      return { targetReply: reply, targetComment: comment };
    }
  }
  
  return { targetReply: null, targetComment: null };
}

/**
 * Find target comment by ID
 */
export function findTargetCommentById(board, commentId) {
  if (!board || !board.comments || !Array.isArray(board.comments)) {
    return null;
  }
  
  for (const comment of board.comments) {
    const cId = String(comment.id || comment._id);
    if (cId === commentId) {
      return comment;
    }
  }
  
  return null;
}

/**
 * Find target by username (searches replies first, then comments)
 */
export async function findTargetByUsername(board, username) {
  if (!board || !board.comments || !Array.isArray(board.comments)) {
    return { targetReply: null, targetComment: null };
  }
  
  // First search in replies
  for (const comment of board.comments) {
    for (const reply of (comment.replies || [])) {
      const replyAuthorName = await User.getUsernameById(reply.author);
      if (replyAuthorName === username) {
        return { targetReply: reply, targetComment: comment };
      }
    }
  }
  
  // Then search in comments
  for (const comment of board.comments) {
    const commentAuthorName = await User.getUsernameById(comment.author);
    if (commentAuthorName === username) {
      return { targetReply: null, targetComment: comment };
    }
  }
  
  return { targetReply: null, targetComment: null };
}

/**
 * Find all cascaded reply IDs (replies that reply to the deleted reply)
 */
export function findCascadedReplyIds(comment, replyId) {
  const repliesToDelete = new Set([String(replyId)]);
  let foundNew = true;
  
  while (foundNew) {
    foundNew = false;
    for (const r of (comment.replies || [])) {
      const rId = String(r.id || r._id);
      if (repliesToDelete.has(rId)) continue;
      
      const rReplyTo = r.replyTo ? String(r.replyTo) : null;
      if (rReplyTo && repliesToDelete.has(rReplyTo)) {
        repliesToDelete.add(rId);
        foundNew = true;
      }
    }
  }
  
  return repliesToDelete;
}

