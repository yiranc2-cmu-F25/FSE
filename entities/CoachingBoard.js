import CoachingBoardDac from "../dacs/coachingBoardDac.js";

class CoachingBoard {
	constructor({ title, category, description, objective, steps, relatedSkills, tools = [], notes = "", author, publicationState = "draft" }) {
		this.title = title;
		this.category = category;
		this.description = description;
		this.objective = objective;
		this.steps = steps;
		this.relatedSkills = relatedSkills;
		this.tools = tools;
		this.notes = notes;
		this.author = author;
		this.publicationState = publicationState;
	}

	static get DAO() {
		return CoachingBoardDac.DAO;
	}

	static async checkDuplicateTitle({ title, category }) {
		return await CoachingBoard.DAO.checkDuplicateTitle({ title, category });
	}

	getPayload() {
		return {
				title: this.title,
				category: this.category,
				description: this.description,
				objective: this.objective,
				steps: this.steps,
				relatedSkills: this.relatedSkills,
				tools: this.tools,
				notes: this.notes
		};
			}

	async saveDraft() {
		return await CoachingBoard.DAO.createDraftOrUpdate({
			author: this.author,
			payload: this.getPayload()
		});
	}

	static async getMyDraft({ author }) {
		return await CoachingBoard.DAO.getMyDraft({ author });
	}

	async publishNew() {
		return await CoachingBoard.DAO.publishNew({
			author: this.author,
			payload: this.getPayload()
		});
	}

	async publishFromDraft() {
		return await CoachingBoard.DAO.publishFromDraft({
			author: this.author,
			payload: this.getPayload()
		});
	}

	static async listPublished() {
		return await CoachingBoard.DAO.listPublished();
	}

	static async getById({ id }) {
		return await CoachingBoard.DAO.getById({ id });
	}

	static async updateBoard({ id, author, update }) {
		return await CoachingBoard.DAO.updateBoard({ id, author, update });
	}

	static async deleteBoard({ id, author }) {
		return await CoachingBoard.DAO.deleteBoard({ id, author });
	}

	static async addComment({ id, author, comment, timestamp }) {
		return await CoachingBoard.DAO.addComment({ id, author, comment, timestamp });
	}

	static async addReply({ id, commentId, author, reply, timestamp, replyTo = null }) {
		return await CoachingBoard.DAO.addReply({ id, commentId, author, reply, timestamp, replyTo });
	}

	static async subscribe({ id, userId }) {
		return await CoachingBoard.DAO.subscribe({ id, userId });
	}
	
	static async unsubscribe({ id, userId }) {
		return await CoachingBoard.DAO.unsubscribe({ id, userId });
	}

	static async toggleCommentLike({ id, commentId, userId }) {
		return await CoachingBoard.DAO.toggleCommentLike({ id, commentId, userId });
	}

	static async toggleReplyLike({ id, commentId, replyId, userId }) {
		return await CoachingBoard.DAO.toggleReplyLike({ id, commentId, replyId, userId });
	}

	static async deleteComment({ id, commentId, author }) {
		return await CoachingBoard.DAO.deleteComment({ id, commentId, author });
	}

	static async deleteReply({ id, commentId, replyId, author }) {
		return await CoachingBoard.DAO.deleteReply({ id, commentId, replyId, author });
	}

	static async findPublishedByTitleCategory({ title, category }) {
		return await CoachingBoard.DAO.findPublishedByTitleCategory({ title, category });
	}

	static async existsPublishedByTitle({ title, excludeId = null }) {
		return await CoachingBoard.DAO.existsPublishedByTitle({ title, excludeId });
	}

	static async findPublishedByTitle({ title, excludeId = null }) {
		return await CoachingBoard.DAO.findPublishedByTitle({ title, excludeId });
	}

	static async deleteDraft({ author }) {
		return await CoachingBoard.DAO.deleteDraft({ author });
	}

	static async markNotificationSeen({ id, userId }) {
		return await CoachingBoard.DAO.markNotificationSeen({ id, userId });
	}

	static async getPendingNotificationsForUser({ userId }) {
		return await CoachingBoard.DAO.getPendingNotificationsForUser({ userId });
	}

	static async searchBoards(params) {
		return await CoachingBoard.DAO.searchBoards(params);
	}
}

export default CoachingBoard;


