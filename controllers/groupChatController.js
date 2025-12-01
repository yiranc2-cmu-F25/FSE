// Group Chat Controller
// Handles all group chat related operations

import Group from "../entities/Group.js";
import GroupMessage from "../entities/GroupMessage.js";
import User from "../entities/User.js";
import { isUsernameValid } from "../utils/validators.js";

const normId = (idLike) => {
  if (idLike == null) return "";
  if (typeof idLike === "string") return idLike;
  if (typeof idLike === "object") {
    return String(idLike._id ?? idLike.id ?? "");
  }
  return idLike.toString ? idLike.toString() : String(idLike);
};

const MIN_MEMBERS = 1;
const MAX_MEMBERS = 9;

/**
 * Create a new group
 * @route POST /api/groups
 */
export async function createGroup(req, res) {
  try {
    const { groupName, memberIds } = req.body;
    const ownerId = normId(req.user?.id ?? req.userId);

    if (!groupName) {
      return res.status(400).json({
        status: "error",
        message: "Group name is required"
      });
    }

    // Check if group name already exists
    const trimmedGroupName = groupName.trim();
    const existingGroup = await Group.findByGroupName(trimmedGroupName);
    if (existingGroup) {
      return res.status(409).json({
        status: "error",
        message: "Group name already exists"
      });
    }

    const members = memberIds || [];

    // Validate member count (not including owner)
    if (members.length < MIN_MEMBERS || members.length > MAX_MEMBERS) {
      return res.status(400).json({
        status: "error",
        message: `Group must have between ${MIN_MEMBERS} and ${MAX_MEMBERS} members (excluding owner)`
      });
    }

    if (!isUsernameValid(groupName)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid group name`
      });
    }

    const group = new Group({
      groupName: trimmedGroupName,
      owner: ownerId,
      members: members
    });

    const createdGroup = await group.create();

    return res.status(201).json({
      message: "Group created successfully",
      groupId: String(createdGroup._id)
    });
  } catch (err) {
    console.error("Error creating group:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Add members to an existing group
 * @route PATCH /api/groups/:groupId/members
 */
export async function addGroupMembers(req, res) {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const userId = normId(req.user?.id ?? req.userId);

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "User IDs are required"
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is owner
    const isOwner = await Group.isUserOwner(groupId, userId);
    if (!isOwner) {
      return res.status(403).json({
        status: "error",
        message: "Only group owner can add members"
      });
    }

    // Check if adding members would exceed limit
    const currentMemberCount = group.members.length;
    const newMemberCount = currentMemberCount + userIds.length;

    if (newMemberCount > MAX_MEMBERS) {
      return res.status(400).json({
        status: "error",
        message: `Cannot add members. Group would exceed maximum of ${MAX_MEMBERS} members (excluding owner)`
      });
    }

    await Group.addMembers(groupId, userIds);

    return res.status(200).json({
      message: "Members added successfully"
    });
  } catch (err) {
    console.error("Error adding group members:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Helper: Validate that users to remove are actually in the group
 */
function validateUsersInGroup(group, userIds) {
  const memberIdsSet = new Set(group.members.map(id => normId(id)));
  const invalidUsers = userIds.filter(id => !memberIdsSet.has(normId(id)));
  return invalidUsers;
}

/**
 * Helper: Handle the special case where the last member is leaving
 */
async function handleLastMemberLeaving(groupId) {
  // Delete all group messages first
  await GroupMessage.deleteByGroupId(groupId);
  // Delete the group
  await Group.deleteGroup(groupId);
}

/**
 * Helper: Check if removing members would violate minimum member requirement
 */
function validateMinimumMembers(currentMemberCount, userIdsLength) {
  const newMemberCount = currentMemberCount - userIdsLength;
  return newMemberCount < MIN_MEMBERS;
}

/**
 * Remove members from an existing group
 * @route DELETE /api/groups/:groupId/members
 */
export async function removeGroupMembers(req, res) {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const userId = normId(req.user?.id ?? req.userId);

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "User IDs are required"
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is owner or trying to leave themselves
    const isOwner = await Group.isUserOwner(groupId, userId);
    const isLeavingThemselves = userIds.length === 1 && normId(userIds[0]) === userId;

    if (!isOwner && !isLeavingThemselves) {
      return res.status(403).json({
        status: "error",
        message: "Only group owner can remove members"
      });
    }

    // Check if users to remove are actually in the group
    const invalidUsers = validateUsersInGroup(group, userIds);

    if (invalidUsers.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Some users are not members of this group"
      });
    }

    // Check if removing members would go below minimum
    const currentMemberCount = group.members.length;

    // Special case: if the last member is leaving (and they're the only member), delete the group
    if (isLeavingThemselves && currentMemberCount === 1) {
      await handleLastMemberLeaving(groupId);

      return res.status(200).json({
        message: "Left group successfully (group deleted as last member)"
      });
    }

    if (validateMinimumMembers(currentMemberCount, userIds.length)) {
      return res.status(400).json({
        status: "error",
        message: `Cannot remove members. Group must have at least ${MIN_MEMBERS} members (excluding owner)`
      });
    }

    await Group.removeMembers(groupId, userIds);

    return res.status(200).json({
      message: "Members removed successfully"
    });
  } catch (err) {
    console.error("Error removing group members:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Mark group as read for current user
 * @route POST /api/groups/:groupId/read
 */
export async function markGroupAsRead(req, res) {
  try {
    const { groupId } = req.params;
    const userId = normId(req.user?.id ?? req.userId);

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is a member of the group
    const isMember = await Group.isUserInGroup(groupId, userId);
    if (!isMember) {
      return res.status(403).json({
        status: "error",
        message: "You are not a member of this group"
      });
    }

    // Clear unread status for this user
    await Group.clearUnreadForUser(groupId, userId);

    return res.status(200).json({
      message: "Group marked as read"
    });
  } catch (err) {
    console.error("Error marking group as read:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Helper: Format user info for response
 */
function formatUserInfo(user) {
  if (!user) {
    return null;
  }
  return {
    id: String(user._id),
    name: user.username || "Unknown",
    status: user.status || "UNDEFINED"
  };
}

/**
 * Helper: Get owner details
 */
async function getOwnerInfo(group) {
  const owner = await User.findById(normId(group.owner));
  return formatUserInfo(owner);
}

/**
 * Helper: Get all member details
 */
async function getAllMemberDetails(group) {
  const memberDetails = [];
  for (const memberId of group.members) {
    const member = await User.findById(normId(memberId));
    if (member) {
      memberDetails.push(formatUserInfo(member));
    }
  }
  return memberDetails;
}

/**
 * Get group details
 * @route GET /api/groups/:groupId
 */
export async function getGroupDetails(req, res) {
  try {
    const { groupId } = req.params;
    const userId = normId(req.user?.id ?? req.userId);

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is member or owner
    const isOwner = await Group.isUserOwner(groupId, userId);
    const isMember = group.members.some(memberId => normId(memberId) === userId);

    if (!isMember && !isOwner) {
      return res.status(403).json({
        status: "error",
        message: "You are not a member of this group"
      });
    }

    // Get owner details
    const ownerInfo = await getOwnerInfo(group);

    // Get all member details
    const memberDetails = await getAllMemberDetails(group);

    // Calculate total number (owner + members)
    const totalCount = 1 + group.members.length;

    return res.status(200).json({
      groupId: String(group._id),
      groupName: group.groupName,
      totalCount,
      owner: ownerInfo,
      members: memberDetails,
      isOwner
    });
  } catch (err) {
    console.error("Error getting group details:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Delete a group
 * @route DELETE /api/groups/:groupId
 */
export async function deleteGroup(req, res) {
  try {
    const { groupId } = req.params;
    const userId = normId(req.user?.id ?? req.userId);

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is owner
    const isOwner = await Group.isUserOwner(groupId, userId);
    if (!isOwner) {
      return res.status(403).json({
        status: "error",
        message: "Only group owner can delete the group"
      });
    }

    // Delete all messages in the group
    await GroupMessage.deleteByGroupId(groupId);

    // Delete the group
    await Group.deleteGroup(groupId);

    return res.status(200).json({
      message: "Group deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting group:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Get list of all groups for the authenticated user
 * @route GET /api/groups
 */
export async function getGroupsList(req, res) {
  try {
    const userId = normId(req.user?.id ?? req.userId);

    const groups = await Group.findGroupsByUserId(userId);

    const groupsList = await Promise.all(groups.map(async (group) => {
      const ownerUsername = group.owner?.username || "Unknown";
      const memberUsernames = group.members.map(member => member.username);
      const allUsernames = [ownerUsername, ...memberUsernames];

      // Check if current user has unread messages in this group
      const hasUnread = group.unreadBy && group.unreadBy.some(id => normId(id) === userId);

      return {
        groupId: String(group._id),
        groupName: group.groupName,
        timestamp: group.timestamp,
        usernames: allUsernames,
        hasUnread: hasUnread || false
      };
    }));

    return res.status(200).json(groupsList);
  } catch (err) {
    console.error("Error getting groups list:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Get all messages from a specific group
 * @route GET /api/groups/:groupId/messages
 */
export async function getGroupMessages(req, res) {
  try {
    const { groupId } = req.params;
    const userId = normId(req.user?.id ?? req.userId);

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is a member of the group
    const isMember = await Group.isUserInGroup(groupId, userId);
    if (!isMember) {
      return res.status(403).json({
        status: "error",
        message: "You are not a member of this group"
      });
    }

    const messages = await GroupMessage.findByGroupId(groupId);

    const messagesData = messages.map(msg => {
      const senderId = normId(msg.sender?._id ?? msg.sender);
      const isOwn = senderId === userId;

      return {
        id: String(msg.id),
        groupId: String(msg.group),
        senderId: senderId,
        senderName: msg.sender?.username || "Unknown",
        messageText: msg.content,
        timestamp: msg.timestamp,
        status: msg.status,
        isOwn: isOwn
      };
    });

    return res.status(200).json(messagesData);
  } catch (err) {
    console.error("Error getting group messages:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}

/**
 * Helper: Get all usernames for group members
 */
async function getGroupMemberUsernames(group) {
  const owner = await User.findById(normId(group.owner));
  const ownerUsername = owner?.username;

  const memberUsernames = [];
  for (const memberId of group.members) {
    const member = await User.findById(normId(memberId));
    if (member) {
      memberUsernames.push(member.username);
    }
  }

  return ownerUsername ? [ownerUsername, ...memberUsernames] : memberUsernames;
}

/**
 * Helper: Emit socket event for group message
 */
async function emitGroupMessageSocket(socketInstance, senderId, group, groupId, messageText, status, msgTimestamp) {
  if (!socketInstance) {
    return;
  }

  // Get sender info
  const sender = await User.findById(senderId);
  const senderUsername = sender?.username || "Unknown";

  // Get all group member usernames (owner + members)
  const allGroupUsernames = await getGroupMemberUsernames(group);

  socketInstance.emitGroupMessage(senderUsername, allGroupUsernames, {
    groupId: String(groupId),
    sender: senderUsername,
    content: messageText.trim(),
    status: status,
    timestamp: msgTimestamp,
  });
}

/**
 * Helper: Update group state after message is sent
 */
async function updateGroupStateAfterMessage(groupId, group, msgTimestamp) {
  // Update group's timestamp to latest message timestamp
  await Group.updateTimestamp(groupId, msgTimestamp);

  // Mark all group members as having unread messages
  const allMemberIds = [normId(group.owner), ...group.members.map(m => normId(m))];
  await Group.markUnreadForAll(groupId, allMemberIds);
}

/**
 * Send a message to a group
 * @route POST /api/groups/:groupId/messages
 */
export async function sendGroupMessage(req, res) {
  try {
    const { groupId } = req.params;
    const { messageText, status, timestamp } = req.body;
    const senderId = normId(req.user?.id ?? req.userId);

    if (!messageText || !status) {
      return res.status(400).json({
        status: "error",
        message: "Message text and status are required"
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found"
      });
    }

    // Check if user is a member of the group
    const isMember = await Group.isUserInGroup(groupId, senderId);
    if (!isMember) {
      return res.status(403).json({
        status: "error",
        message: "You are not a member of this group"
      });
    }

    const msgTimestamp = timestamp || new Date();

    const message = new GroupMessage({
      sender: senderId,
      group: groupId,
      content: messageText.trim(),
      status: status,
      timestamp: msgTimestamp
    });

    const createdMessage = await message.create();

    await updateGroupStateAfterMessage(groupId, group, msgTimestamp);

    // Emit socket event to all group members
    const socketInstance = req.app?.get("socketInstance");
    await emitGroupMessageSocket(socketInstance, senderId, group, groupId, messageText, status, msgTimestamp);

    return res.status(201).json({
      message: "Message sent successfully",
      messageId: String(createdMessage._id)
    });
  } catch (err) {
    console.error("Error sending group message:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
}
