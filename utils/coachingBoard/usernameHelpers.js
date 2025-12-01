// utils/coachingBoard/usernameHelpers.js
// Helper functions for username mapping and enrichment

import User from "../../entities/User.js";

/**
 * Collect user IDs from comments and replies
 */
export function collectUserIdsFromComments(comments) {
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

/**
 * Create username map from user IDs
 */
export async function createUsernameMap(userIds) {
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

/**
 * Enrich comments with author names
 */
export function enrichCommentsWithAuthorNames(comments, usernameMap) {
  if (!Array.isArray(comments)) return;
  
  for (const comment of comments) {
    comment.authorName = usernameMap.get(String(comment.author)) || "Unknown";
    if (comment.replies && Array.isArray(comment.replies)) {
      for (const reply of comment.replies) {
        reply.authorName = usernameMap.get(String(reply.author)) || "Unknown";
      }
    }
  }
}

/**
 * Enrich replies with author names
 */
export function enrichRepliesWithAuthorNames(replies, usernameMap) {
  if (!Array.isArray(replies)) return;
  
  for (const reply of replies) {
    reply.authorName = usernameMap.get(String(reply.author)) || "Unknown";
  }
}

