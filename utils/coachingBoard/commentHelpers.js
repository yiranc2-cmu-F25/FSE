// utils/coachingBoard/commentHelpers.js
// Helper functions for comment sorting and manipulation

/**
 * Compare two comments/replies by likes and timestamp
 */
function compareByLikesAndTime(a, b) {
  const aLikes = (a.likes || []).length;
  const bLikes = (b.likes || []).length;
  if (aLikes !== bLikes) {
    return bLikes - aLikes;
  }
  const aTime = new Date(a.timestamp || 0).getTime();
  const bTime = new Date(b.timestamp || 0).getTime();
  return bTime - aTime;
}

/**
 * Sort comments by likes and time
 */
export function sortCommentsByLikesAndTime(comments) {
  if (!Array.isArray(comments)) return;
  comments.sort(compareByLikesAndTime);
}

/**
 * Sort replies by likes and time
 */
export function sortRepliesByLikesAndTime(replies) {
  if (!Array.isArray(replies)) return;
  replies.sort(compareByLikesAndTime);
}

/**
 * Sort all replies in comments array
 */
export function sortAllRepliesInComments(comments) {
  if (!Array.isArray(comments)) return;
  for (const comment of comments) {
    if (comment.replies && Array.isArray(comment.replies)) {
      sortRepliesByLikesAndTime(comment.replies);
    }
  }
}

/**
 * Separate highlighted comment from others
 */
export function separateHighlightedComment(comments, highlightCommentId) {
  if (!Array.isArray(comments) || !highlightCommentId) {
    return { highlightedComment: null, otherComments: comments || [] };
  }

  const normalizedHighlightId = String(highlightCommentId).trim();
  let highlightedComment = null;
  const otherComments = [];

  for (const comment of comments) {
    const commentId = String(comment.id || comment._id || "").trim();
    if (commentId === normalizedHighlightId) {
      highlightedComment = comment;
    } else {
      otherComments.push(comment);
    }
  }

  return { highlightedComment, otherComments };
}

/**
 * Organize comments with highlighted comment first
 */
export function organizeCommentsWithHighlight(comments, highlightCommentId) {
  if (!Array.isArray(comments)) return comments;

  if (!highlightCommentId) {
    sortCommentsByLikesAndTime(comments);
    sortAllRepliesInComments(comments);
    return comments;
  }

  const { highlightedComment, otherComments } = separateHighlightedComment(comments, highlightCommentId);
  
  sortCommentsByLikesAndTime(otherComments);
  sortAllRepliesInComments(otherComments);

  if (highlightedComment) {
    sortRepliesByLikesAndTime(highlightedComment.replies);
    return [highlightedComment, ...otherComments];
  } else {
    sortCommentsByLikesAndTime(comments);
    sortAllRepliesInComments(comments);
    return comments;
  }
}

/**
 * Limit comments and replies for display
 */
export function limitCommentsForDisplay(comments, maxComments = 10, highlightCommentId = null, highlightReplyId = null) {
  if (!Array.isArray(comments)) return [];

  const limitedComments = comments.slice(0, maxComments).map(c => {
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

  return limitedComments;
}

