/**
 * Utility functions for transforming task data structures
 */

/**
 * Gets the base task properties from a document
 * @param {Object} doc - Task document
 * @returns {Object} Base task properties
 */
function getBaseTaskProperties(doc) {
  return {
    id: doc._id || doc.id,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    helpers: doc.helpers,
    emergencyLevel: doc.emergencyLevel,
    taskType: doc.taskType,
    dueDate: doc.dueDate,
    location: doc.location,
    resourcesNeeded: doc.resourcesNeeded || {},
    skillsRequired: doc.skillsRequired || [],
    isOpen: doc.isOpen,
    creator: doc.creator,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Transforms a task document to a standardized format
 * @param {Object} doc - Task document from database
 * @param {Object} options - Additional transformation options
 * @param {number} options.participantCount - Number of participants
 * @param {boolean} options.isParticipant - Whether user is a participant
 * @param {Array} options.helperAvatars - Array of helper avatar objects
 * @param {Array} options.participantNames - Array of participant usernames
 * @param {Array} options.taskLogs - Array of task log objects
 * @returns {Object} Transformed task object
 */
export function transformTaskDoc(doc, options = {}) {
  const {
    participantCount = 0,
    isParticipant = false,
    helperAvatars = [],
    participantNames = [],
    taskLogs = [],
  } = options;

  return {
    ...getBaseTaskProperties(doc),
    helpersJoined: participantCount,
    isParticipant: isParticipant,
    helperAvatars: helperAvatars,
    participantNames: participantNames,
    taskLogs: taskLogs.map((log) => ({
      timestamp: log.timestamp,
      summary: log.summary,
      user: log.user,
    })),
  };
}

/**
 * Transforms a task document to a simple format (without participants/logs)
 * @param {Object} doc - Task document from database
 * @returns {Object} Transformed task object
 */
export function transformTaskDocSimple(doc) {
  return getBaseTaskProperties(doc);
}

/**
 * Generates helper avatars from participant data
 * @param {Array} participants - Array of participant objects with user info
 * @returns {Array} Array of avatar objects with initials and color
 */
export function generateHelperAvatars(participants) {
  return participants.map((p) => {
    const username = p.user?.username || "";
    const initials = username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    // Generate a color based on username hash
    const colors = [
      "#f97316", "#0ea5e9", "#22c55e", "#6366f1", "#a855f7", "#facc15",
      "#ef4444", "#14b8a6", "#8b5cf6", "#ec4899",
    ];
    const hash = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = colors[hash % colors.length];
    return { initials, color };
  });
}

/**
 * Extracts participant names from participant data
 * @param {Array} participants - Array of participant objects with user info
 * @returns {Array} Array of participant usernames
 */
export function extractParticipantNames(participants) {
  return participants
    .map((p) => p.user?.username)
    .filter((name) => typeof name === "string" && name.trim().length > 0);
}

