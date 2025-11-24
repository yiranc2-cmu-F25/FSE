// Voice Call Controller
// Handles group voice call operations

// In-memory storage for active voice call rooms
// Structure: Map<groupId, Map<userId, { username, socketId }>>
const voiceCallRooms = new Map();

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
    const isActive = callRoom && callRoom.size > 0;
    const participantUsernames = isActive
      ? Array.from(callRoom.values()).map(p => p.username)
      : [];

    res.status(200).json({
      groupId: groupId,
      isActive: isActive,
      participantCount: isActive ? callRoom.size : 0,
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

    // Get list of existing participants
    const participants = Array.from(callRoom.entries())
      .filter(([id]) => id !== userId)
      .map(([id, user]) => ({
        userId: id,
        username: user.username,
        socketId: user.socketId
      }));

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
    // This allows everyone to see "call ongoing" status
    const callParticipantCount = callRoom.size;
    const participantUsernames = Array.from(callRoom.values()).map(p => p.username);

    socketInstance.io.emit('voice-call-status-update', {
      groupId: groupId,
      isActive: true,
      participantCount: callParticipantCount,
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

    // Broadcast call status update to ALL group members
    const isCallActive = callRoom.size > 0;
    const participantUsernames = Array.from(callRoom.values()).map(p => p.username);

    socketInstance.io.emit('voice-call-status-update', {
      groupId: groupId,
      isActive: isCallActive,
      participantCount: callRoom.size,
      participants: participantUsernames
    });

    // Clean up empty rooms
    if (callRoom.size === 0) {
      voiceCallRooms.delete(groupId);
    }

    res.status(200).json({
      message: "Successfully left voice call",
      roomId: groupId,
      remainingParticipants: callRoom.size
    });
  } catch (error) {
    console.error("Error leaving voice call:", error);
    res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}
