import {
  sortCommentsByLikesAndTime,
  sortRepliesByLikesAndTime,
  sortAllRepliesInComments,
  separateHighlightedComment,
  organizeCommentsWithHighlight,
  limitCommentsForDisplay,
} from "../utils/coachingBoard/commentHelpers.js";

describe("commentHelpers", () => {
  describe("sortCommentsByLikesAndTime", () => {
    test("should sort comments by likes (descending), then by timestamp (descending)", () => {
      const comments = [
        { id: "1", likes: [], timestamp: new Date("2024-01-01") },
        { id: "2", likes: ["user1"], timestamp: new Date("2024-01-02") },
        { id: "3", likes: ["user1", "user2"], timestamp: new Date("2024-01-01") },
        { id: "4", likes: ["user1"], timestamp: new Date("2024-01-01") },
      ];

      sortCommentsByLikesAndTime(comments);

      expect(comments[0].id).toBe("3"); // Most likes
      expect(comments[1].id).toBe("2"); // Same likes, newer timestamp
      expect(comments[2].id).toBe("4"); // Same likes, older timestamp
      expect(comments[3].id).toBe("1"); // No likes
    });

    test("should handle missing likes array", () => {
      const comments = [
        { id: "1", timestamp: new Date("2024-01-01") },
        { id: "2", likes: ["user1"], timestamp: new Date("2024-01-02") },
      ];

      sortCommentsByLikesAndTime(comments);

      expect(comments[0].id).toBe("2");
      expect(comments[1].id).toBe("1");
    });

    test("should handle missing timestamp", () => {
      const comments = [
        { id: "1", likes: ["user1"] },
        { id: "2", likes: ["user1"], timestamp: new Date("2024-01-02") },
      ];

      sortCommentsByLikesAndTime(comments);

      expect(comments[0].id).toBe("2");
      expect(comments[1].id).toBe("1");
    });

    test("should not modify non-array input", () => {
      const notArray = { comments: [] };
      sortCommentsByLikesAndTime(notArray);
      expect(notArray).toEqual({ comments: [] });
    });

    test("should handle null input", () => {
      expect(() => sortCommentsByLikesAndTime(null)).not.toThrow();
    });
  });

  describe("sortRepliesByLikesAndTime", () => {
    test("should sort replies by likes and timestamp", () => {
      const replies = [
        { id: "1", likes: [], timestamp: new Date("2024-01-01") },
        { id: "2", likes: ["user1"], timestamp: new Date("2024-01-02") },
      ];

      sortRepliesByLikesAndTime(replies);

      expect(replies[0].id).toBe("2");
      expect(replies[1].id).toBe("1");
    });

    test("should not modify non-array input", () => {
      const notArray = { replies: [] };
      sortRepliesByLikesAndTime(notArray);
      expect(notArray).toEqual({ replies: [] });
    });
  });

  describe("sortAllRepliesInComments", () => {
    test("should sort replies in all comments", () => {
      const comments = [
        {
          id: "1",
          replies: [
            { id: "r1", likes: [], timestamp: new Date("2024-01-01") },
            { id: "r2", likes: ["user1"], timestamp: new Date("2024-01-02") },
          ],
        },
        {
          id: "2",
          replies: [
            { id: "r3", likes: ["user1", "user2"], timestamp: new Date("2024-01-01") },
            { id: "r4", likes: ["user1"], timestamp: new Date("2024-01-02") },
          ],
        },
      ];

      sortAllRepliesInComments(comments);

      expect(comments[0].replies[0].id).toBe("r2");
      expect(comments[1].replies[0].id).toBe("r3"); // r3 has more likes (2) than r4 (1)
    });

    test("should handle comments without replies", () => {
      const comments = [
        { id: "1", replies: [] },
        { id: "2" },
      ];

      expect(() => sortAllRepliesInComments(comments)).not.toThrow();
    });

    test("should not modify non-array input", () => {
      const notArray = { comments: [] };
      sortAllRepliesInComments(notArray);
      expect(notArray).toEqual({ comments: [] });
    });
  });

  describe("separateHighlightedComment", () => {
    test("should separate highlighted comment from others", () => {
      const comments = [
        { id: "1", comment: "First" },
        { id: "2", comment: "Second" },
        { id: "3", comment: "Third" },
      ];

      const result = separateHighlightedComment(comments, "2");

      expect(result.highlightedComment.id).toBe("2");
      expect(result.otherComments).toHaveLength(2);
      expect(result.otherComments[0].id).toBe("1");
      expect(result.otherComments[1].id).toBe("3");
    });

    test("should handle _id instead of id", () => {
      const comments = [
        { _id: "1", comment: "First" },
        { _id: "2", comment: "Second" },
      ];

      const result = separateHighlightedComment(comments, "2");

      expect(result.highlightedComment._id).toBe("2");
      expect(result.otherComments).toHaveLength(1);
    });

    test("should trim and normalize IDs", () => {
      const comments = [
        { id: "1", comment: "First" },
        { id: "  2  ", comment: "Second" },
      ];

      const result = separateHighlightedComment(comments, "  2  ");

      expect(result.highlightedComment.id).toBe("  2  ");
      expect(result.otherComments).toHaveLength(1);
    });

    test("should return null highlightedComment when not found", () => {
      const comments = [
        { id: "1", comment: "First" },
        { id: "2", comment: "Second" },
      ];

      const result = separateHighlightedComment(comments, "999");

      expect(result.highlightedComment).toBeNull();
      expect(result.otherComments).toHaveLength(2);
    });

    test("should return all comments as otherComments when highlightCommentId is null", () => {
      const comments = [
        { id: "1", comment: "First" },
        { id: "2", comment: "Second" },
      ];

      const result = separateHighlightedComment(comments, null);

      expect(result.highlightedComment).toBeNull();
      expect(result.otherComments).toEqual(comments);
    });

    test("should handle non-array input", () => {
      const result = separateHighlightedComment(null, "1");
      expect(result.highlightedComment).toBeNull();
      expect(result.otherComments).toEqual([]);
    });

    test("should handle empty string highlightCommentId", () => {
      const comments = [{ id: "1", comment: "First" }];
      const result = separateHighlightedComment(comments, "");
      expect(result.highlightedComment).toBeNull();
      expect(result.otherComments).toEqual(comments);
    });
  });

  describe("organizeCommentsWithHighlight", () => {
    test("should put highlighted comment first when found", () => {
      const comments = [
        { id: "1", likes: ["user1"], timestamp: new Date("2024-01-02") },
        { id: "2", likes: ["user1", "user2"], timestamp: new Date("2024-01-03") },
        { id: "3", likes: [], timestamp: new Date("2024-01-01") },
      ];

      const result = organizeCommentsWithHighlight(comments, "3");

      expect(result[0].id).toBe("3");
      expect(result.length).toBe(3);
    });

    test("should sort other comments when highlighted comment found", () => {
      const comments = [
        { id: "1", likes: ["user1"], timestamp: new Date("2024-01-02") },
        { id: "2", likes: ["user1", "user2"], timestamp: new Date("2024-01-03") },
        { id: "3", likes: [], timestamp: new Date("2024-01-01") },
      ];

      const result = organizeCommentsWithHighlight(comments, "3");

      expect(result[0].id).toBe("3");
      expect(result[1].id).toBe("2");
      expect(result[2].id).toBe("1");
    });

    test("should sort all comments when highlighted comment not found", () => {
      const comments = [
        { id: "1", likes: ["user1"], timestamp: new Date("2024-01-02") },
        { id: "2", likes: ["user1", "user2"], timestamp: new Date("2024-01-03") },
      ];

      const result = organizeCommentsWithHighlight(comments, "999");

      expect(result[0].id).toBe("2");
      expect(result[1].id).toBe("1");
    });

    test("should sort replies in highlighted comment", () => {
      const comments = [
        {
          id: "1",
          replies: [
            { id: "r1", likes: [], timestamp: new Date("2024-01-01") },
            { id: "r2", likes: ["user1"], timestamp: new Date("2024-01-02") },
          ],
        },
      ];

      const result = organizeCommentsWithHighlight(comments, "1");

      expect(result[0].replies[0].id).toBe("r2");
      expect(result[0].replies[1].id).toBe("r1");
    });

    test("should return original array when not an array", () => {
      const notArray = { comments: [] };
      const result = organizeCommentsWithHighlight(notArray, "1");
      expect(result).toBe(notArray);
    });

    test("should sort all comments when highlightCommentId is null", () => {
      const comments = [
        { id: "1", likes: ["user1"], timestamp: new Date("2024-01-02") },
        { id: "2", likes: ["user1", "user2"], timestamp: new Date("2024-01-03") },
      ];

      const result = organizeCommentsWithHighlight(comments, null);

      expect(result[0].id).toBe("2");
      expect(result[1].id).toBe("1");
    });
  });

  describe("limitCommentsForDisplay", () => {
    test("should limit comments to maxComments", () => {
      const comments = [
        { id: "1", replies: [] },
        { id: "2", replies: [] },
        { id: "3", replies: [] },
      ];

      const result = limitCommentsForDisplay(comments, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });

    test("should include highlighted reply when highlightCommentId and highlightReplyId match", () => {
      const comments = [
        {
          id: "1",
          replies: [
            { id: "r1", reply: "First reply" },
            { id: "r2", reply: "Second reply" },
            { id: "r3", reply: "Third reply" },
          ],
        },
      ];

      const result = limitCommentsForDisplay(comments, 10, "1", "r2");

      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe("r2");
      expect(result[0].totalReplies).toBe(3);
    });

    test("should show first reply when highlighted reply not found", () => {
      const comments = [
        {
          id: "1",
          replies: [
            { id: "r1", reply: "First reply" },
            { id: "r2", reply: "Second reply" },
          ],
        },
      ];

      const result = limitCommentsForDisplay(comments, 10, "1", "r999");

      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe("r1");
    });

    test("should show first reply when no highlightReplyId", () => {
      const comments = [
        {
          id: "1",
          replies: [
            { id: "r1", reply: "First reply" },
            { id: "r2", reply: "Second reply" },
          ],
        },
      ];

      const result = limitCommentsForDisplay(comments, 10, null, null);

      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe("r1");
    });

    test("should handle _id instead of id", () => {
      const comments = [
        {
          _id: "1",
          replies: [
            { _id: "r1", reply: "First reply" },
            { _id: "r2", reply: "Second reply" },
          ],
        },
      ];

      const result = limitCommentsForDisplay(comments, 10, "1", "r2");

      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0]._id).toBe("r2");
    });

    test("should return empty array for non-array input", () => {
      const result = limitCommentsForDisplay(null, 10);
      expect(result).toEqual([]);
    });

    test("should handle comments without replies", () => {
      const comments = [{ id: "1" }];

      const result = limitCommentsForDisplay(comments, 10);

      expect(result[0].replies).toEqual([]);
      expect(result[0].totalReplies).toBe(0);
    });

    test("should preserve comment properties", () => {
      const comments = [
        {
          id: "1",
          comment: "Test comment",
          author: "user1",
          replies: [],
        },
      ];

      const result = limitCommentsForDisplay(comments, 10);

      expect(result[0].comment).toBe("Test comment");
      expect(result[0].author).toBe("user1");
    });
  });
});

