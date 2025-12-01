// Voice Call Controller
// Handles group voice call operations

import User from "../entities/User.js";
import { isUserActive } from "../utils/filterInactiveUsers.js";
import { USER_STATUS } from "../constants/userStatus.js";

// In-memory storage for active voice call rooms
// Structure: Map<groupId, Map<userId, { username, socketId }>>
const voiceCallRooms = new Map();

/**
 * Helper function to filter out inactive participants
 * @param {Map} callRoom - Map of userId -> {username, socketId}
 * @returns {Array} - Array of active participant usernames
 */
async function getActiveParticipantUsernames(callRoom) {
  if (!callRoom || callRoom.size === 0) {
    return [];
  }

  const participantUsernames = [];

  for (const [userId, userInfo] of callRoom.entries()) {
    const user = await User.findById(userId);
    if (user && isUserActive(user)) {
      participantUsernames.push(userInfo.username);
    }
  }

  return participantUsernames;
}

/**
 * Helper function to filter out inactive participants and return full participant objects
 * @param {Map} callRoom - Map of userId -> {username, socketId}
 * @param {string} excludeUserId - Optional userId to exclude from results
 * @returns {Array} - Array of active participant objects {userId, username, socketId}
 */
async function getActiveParticipants(callRoom, excludeUserId = null) {
  if (!callRoom || callRoom.size === 0) {
    return [];
  }

  const activeParticipants = [];

  for (const [userId, userInfo] of callRoom.entries()) {
    if (excludeUserId && userId === excludeUserId) {
      continue;
    }

    const user = await User.findById(userId);
    if (user && isUserActive(user)) {
      activeParticipants.push({
        userId: userId,
        username: userInfo.username,
        socketId: userInfo.socketId
      });
    }
  }

  return activeParticipants;
}

/**
 * Get voice call status for a group
 * @route GET /api/calls/status/:groupId
 */
export async function getVoiceCallStatus(req, res) {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        status: "error",
        message: "Group ID is required"
      });
    }

    const callRoom = voiceCallRooms.get(groupId);

    // Filter to only include active participants
    const participantUsernames = callRoom
      ? await getActiveParticipantUsernames(callRoom)
      : [];

    const isActive = participantUsernames.length > 0;

    res.status(200).json({
      groupId: groupId,
      isActive: isActive,
      participantCount: participantUsernames.length,
      participants: participantUsernames
    });
  } catch (error) {
    console.error("Error getting voice call status:", error);
    res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Join a group voice call room
 * @route POST /api/calls/join-room
 */
export async function joinVoiceCall(req, res) {
  try {
    const { groupId } = req.body;
    const userId = req.userId?.toString();
    const username = req.username;

    if (!groupId) {
      return res.status(400).json({
        status: "error",
        message: "Group ID is required"
      });
    }

    if (!userId || !username) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    // Get socket instance
    const socketInstance = req.app.get("socketInstance");
    if (!socketInstance) {
      return res.status(500).json({
        status: "error",
        message: "Socket instance not available"
      });
    }

    // Get user's socket ID from the Socket instance
    const userRoom = socketInstance.roomFor(username);
    const room = socketInstance.io.sockets.adapter.rooms.get(userRoom);
    const socketId = room ? Array.from(room)[0] : null;

    if (!socketId) {
      return res.status(400).json({
        status: "error",
        message: "User socket not found. Please refresh the page."
      });
    }

    // Initialize room if it doesn't exist
    if (!voiceCallRooms.has(groupId)) {
      voiceCallRooms.set(groupId, new Map());
    }

    const callRoom = voiceCallRooms.get(groupId);

    // Add user to call room
    callRoom.set(userId, { username, socketId });

    // Get list of existing active participants (excluding current user)
    const participants = await getActiveParticipants(callRoom, userId);

    // Notify existing participants about the new user
    participants.forEach(participant => {
      socketInstance.io.to(participant.socketId).emit('voice-user-joined', {
        socketId: socketId,
        userId: userId,
        username: username,
        groupId: groupId
      });
    });

    // Broadcast call status to ALL group members (including non-participants)
    // This allows everyone to see "call ongoing" status (only showing active participants)
    const participantUsernames = await getActiveParticipantUsernames(callRoom);

    socketInstance.io.emit('voice-call-status-update', {
      groupId: groupId,
      isActive: true,
      participantCount: participantUsernames.length,
      participants: participantUsernames
    });

    res.status(200).json({
      message: "Successfully joined voice call",
      roomId: groupId,
      participants: participants
    });
  } catch (error) {
    console.error("Error joining voice call:", error);
    res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Leave a group voice call room
 * @route POST /api/calls/leave-room
 */
export async function leaveVoiceCall(req, res) {
  try {
    const { groupId } = req.body;
    const userId = req.userId?.toString();

    if (!groupId) {
      return res.status(400).json({
        status: "error",
        message: "Group ID is required"
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    // Get socket instance
    const socketInstance = req.app.get("socketInstance");
    if (!socketInstance) {
      return res.status(500).json({
        status: "error",
        message: "Socket instance not available"
      });
    }

    // Check if room exists
    const callRoom = voiceCallRooms.get(groupId);
    if (!callRoom) {
      return res.status(404).json({
        status: "error",
        message: "Call room not found"
      });
    }

    // Get user info before removing
    const userInfo = callRoom.get(userId);
    if (!userInfo) {
      return res.status(404).json({
        status: "error",
        message: "User not in call"
      });
    }

    // Remove user from call room
    callRoom.delete(userId);

    // Notify other participants that user left
    callRoom.forEach((participant) => {
      socketInstance.io.to(participant.socketId).emit('voice-user-left', {
        socketId: userInfo.socketId,
        userId: userId,
        groupId: groupId
      });
    });

    // Broadcast call status update to ALL group members (only showing active participants)
    const participantUsernames = await getActiveParticipantUsernames(callRoom);
    const isCallActive = participantUsernames.length > 0;

    socketInstance.io.emit('voice-call-status-update', {
      groupId: groupId,
      isActive: isCallActive,
      participantCount: participantUsernames.length,
      participants: participantUsernames
    });

    // Clean up empty rooms
    if (callRoom.size === 0) {
      voiceCallRooms.delete(groupId);
    }

    res.status(200).json({
      message: "Successfully left voice call",
      roomId: groupId,
      remainingParticipants: participantUsernames.length
    });
  } catch (error) {
    console.error("Error leaving voice call:", error);
    res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}
