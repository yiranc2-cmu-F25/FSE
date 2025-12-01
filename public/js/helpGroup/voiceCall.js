// Voice Call WebRTC Module for Group Chat
import { getSocket } from "../utils/socket.js";
import { getInitialsSafe, getAvatarColor } from "../utils/avatars.js";

// WebRTC configuration with STUN servers
const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Voice Call State
let localStream = null;
let peerConnections = new Map(); // Map of socketId -> RTCPeerConnection
let participants = new Map(); // Map of socketId -> { userId, username, audioElement }
let isMuted = false;
let isInCall = false;
let currentGroupId = null;
let isPanelExpanded = false;

// Call status for non-participants
let isCallActive = false;
let callParticipantNames = [];

// DOM Elements
const voiceCallPanel = document.getElementById("voice-call-panel");
const voicePanelHeader = document.getElementById("voice-panel-header");
const voicePanelTitle = document.getElementById("voice-panel-title");
const voicePanelSubtitle = document.getElementById("voice-panel-subtitle");
const voicePanelContent = document.getElementById("voice-panel-content");
const voiceToggleBtn = document.getElementById("voice-toggle-btn");
const voiceToggleIcon = document.getElementById("voice-toggle-icon");
const voicePanelJoinBtn = document.getElementById("voice-panel-join-btn");
const voiceCallBtn = document.getElementById("voice-call-btn");
const voiceMuteBtn = document.getElementById("voice-mute-btn");
const voiceLeaveBtn = document.getElementById("voice-leave-btn");
const voiceParticipantsList = document.getElementById("voice-participants-list");
const voiceConnectionStatus = document.getElementById("voice-connection-status");
const voiceControls = document.getElementById("voice-controls");
const participantTemplate = document.getElementById("voice-participant-template");

// Get socket instance
const socket = getSocket();

/**
 * Initialize voice call functionality
 */
export function initVoiceCall(groupId) {
  currentGroupId = groupId;

  // Event listeners
  voiceCallBtn?.addEventListener("click", joinVoiceCall);
  voicePanelJoinBtn?.addEventListener("click", joinVoiceCall);
  voiceMuteBtn?.addEventListener("click", toggleMute);
  voiceLeaveBtn?.addEventListener("click", leaveVoiceCall);

  // Toggle button with stopPropagation to prevent header click
  voiceToggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePanel();
  });

  // Header click to toggle (except when clicking join button or toggle button)
  voicePanelHeader?.addEventListener("click", (e) => {
    // Don't toggle if clicking on join button or toggle button
    if (!e.target.closest("#voice-panel-join-btn") &&
        !e.target.closest("#voice-toggle-btn")) {
      togglePanel();
    }
  });

  // Socket event listeners for WebRTC signaling
  setupSocketListeners();

  // Load initial call status
  loadCallStatus();

  // Cleanup on page unload (navigate away, refresh, close tab)
  window.addEventListener("beforeunload", handlePageUnload);
  window.addEventListener("pagehide", handlePageUnload);
}

/**
 * Handle page unload - leave call if currently in one
 */
function handlePageUnload() {
  if (isInCall) {
    // Use sendBeacon for reliable async call during page unload
    const blob = new Blob(
      [JSON.stringify({ groupId: currentGroupId })],
      { type: "application/json" }
    );
    navigator.sendBeacon("/api/calls/leave-room", blob);

    // Also cleanup local resources
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    peerConnections.forEach((pc) => pc.close());
  }
}

/**
 * Load current call status from server
 */
async function loadCallStatus() {
  try {
    const response = await fetch(`/api/calls/status/${currentGroupId}`, {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      updateCallStatus(data);
    }
  } catch (error) {
    console.error("Error loading call status:", error);
  }
}

/**
 * Handler: Call status update
 */
function handleCallStatusUpdate(data) {
  if (data.groupId !== currentGroupId) return;
  updateCallStatus(data);
}

/**
 * Handler: User joined voice call
 */
async function handleUserJoined(data) {
  if (data.groupId !== currentGroupId || !isInCall) return;

  console.log("Voice user joined:", data);
  // Existing users should NOT initiate - wait for the new user to send offer
  await createPeerConnection(data.socketId, data.username, data.userId, false);
}

/**
 * Handler: WebRTC offer received
 */
async function handleVoiceOffer(data) {
  if (!isInCall) return;

  console.log("Received voice offer from:", data.from);
  const peerConnection = peerConnections.get(data.from);

  if (peerConnection) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("voice-answer", {
      answer: answer,
      target: data.from,
    });
  }
}

/**
 * Handler: WebRTC answer received
 */
async function handleVoiceAnswer(data) {
  if (!isInCall) return;

  console.log("Received voice answer from:", data.from);
  const peerConnection = peerConnections.get(data.from);

  if (peerConnection) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );
  }
}

/**
 * Handler: ICE candidate received
 */
async function handleIceCandidate(data) {
  if (!isInCall) return;

  const peerConnection = peerConnections.get(data.from);

  if (peerConnection && data.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

/**
 * Handler: User left voice call
 */
function handleUserLeft(data) {
  if (data.groupId !== currentGroupId || !isInCall) return;

  console.log("Voice user left:", data);
  removeParticipant(data.socketId);
}

/**
 * Setup Socket.IO listeners for WebRTC signaling and call updates
 */
function setupSocketListeners() {
  // Listen for call status updates (for ALL users in group)
  socket.on("voice-call-status-update", handleCallStatusUpdate);

  // Handle user joined (existing user receives this - DO NOT initiate)
  socket.on("voice-user-joined", handleUserJoined);

  // Handle WebRTC offer
  socket.on("voice-offer", handleVoiceOffer);

  // Handle WebRTC answer
  socket.on("voice-answer", handleVoiceAnswer);

  // Handle ICE candidate
  socket.on("voice-ice-candidate", handleIceCandidate);

  // Handle user left
  socket.on("voice-user-left", handleUserLeft);
}

/**
 * Update call status UI (for both participants and non-participants)
 */
function updateCallStatus(data) {
  isCallActive = data.isActive;
  callParticipantNames = data.participants || [];

  if (isCallActive) {
    // Show the panel
    voiceCallPanel.classList.remove("hidden");

    // Update panel header with unified format (always show participant names)
    if (isInCall) {
      voicePanelTitle.textContent = "You're in the call";
      voicePanelSubtitle.textContent = callParticipantNames.join(", ");
      voicePanelJoinBtn.classList.add("hidden");
    } else {
      voicePanelTitle.textContent = "Voice call ongoing";
      voicePanelSubtitle.textContent = callParticipantNames.join(", ");
      voicePanelJoinBtn.classList.remove("hidden");
    }

    // If expanded and not in call, show participant list
    if (isPanelExpanded && !isInCall) {
      renderNonParticipantList();
    }
  } else {
    // Hide the panel when no call is active
    voiceCallPanel.classList.add("hidden");
    isPanelExpanded = false;
    voicePanelContent.classList.add("hidden");
  }
}

/**
 * Render participant list for non-participants (just names, no WebRTC)
 */
function renderNonParticipantList() {
  voiceParticipantsList.innerHTML = "";

  callParticipantNames.forEach((username) => {
    const clone = participantTemplate.content.cloneNode(true);

    const avatar = clone.querySelector(".voice-participant-avatar");
    const initials = getInitialsSafe(username);
    const color = getAvatarColor(username);
    avatar.textContent = initials;
    avatar.style.backgroundColor = color;

    const name = clone.querySelector(".voice-participant-name");
    name.textContent = username;

    voiceParticipantsList.appendChild(clone);
  });
}

/**
 * Toggle panel expansion
 */
function togglePanel() {
  isPanelExpanded = !isPanelExpanded;

  if (isPanelExpanded) {
    voicePanelContent.classList.remove("hidden");
    voiceToggleIcon.src = "/images/help-group/icon-up.svg";
    voiceToggleIcon.alt = "Collapse";

    // If not in call, show the non-participant list
    if (!isInCall && isCallActive) {
      renderNonParticipantList();
    }
  } else {
    voicePanelContent.classList.add("hidden");
    voiceToggleIcon.src = "/images/help-group/icon-down.svg";
    voiceToggleIcon.alt = "Expand";
  }
}

/**
 * Join voice call
 */
async function joinVoiceCall() {
  if (isInCall) return;

  try {
    // Get local audio stream
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    // Call join API
    const response = await fetch("/api/calls/join-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupId: currentGroupId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to join voice call");
    }

    const data = await response.json();
    console.log("Joined voice call:", data);

    isInCall = true;

    // Update UI for in-call state
    voicePanelTitle.textContent = "You're in the call";
    voicePanelJoinBtn.classList.add("hidden");
    voiceConnectionStatus.classList.remove("hidden");
    voiceControls.classList.remove("hidden");

    // Expand panel if collapsed
    if (!isPanelExpanded) {
      togglePanel();
    }

    // Update status
    updateConnectionStatus("connected");

    // Clear and add self to participants
    voiceParticipantsList.innerHTML = "";
    addSelfToParticipants();

    // Create peer connections for existing participants
    for (const participant of data.participants) {
      await createPeerConnection(
        participant.socketId,
        participant.username,
        participant.userId,
        true
      );
    }
  } catch (error) {
    console.error("Error joining voice call:", error);
    alert("Could not join voice call: " + error.message);

    // Cleanup on error
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
  }
}

/**
 * Leave voice call
 */
async function leaveVoiceCall() {
  if (!isInCall) return;

  try {
    // Call leave API
    await fetch("/api/calls/leave-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupId: currentGroupId,
      }),
    });

    // Cleanup local state
    cleanup();

    // Manually refresh call status to update UI immediately
    // (in case socket event hasn't arrived yet)
    await loadCallStatus();
  } catch (error) {
    console.error("Error leaving voice call:", error);
    // Cleanup anyway
    cleanup();
    await loadCallStatus();
  }
}

/**
 * Cleanup voice call state
 */
function cleanup() {
  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  // Close all peer connections
  peerConnections.forEach((pc) => pc.close());
  peerConnections.clear();

  // Clear participants
  participants.clear();
  voiceParticipantsList.innerHTML = "";

  // Hide in-call UI elements
  voiceConnectionStatus.classList.add("hidden");
  voiceControls.classList.add("hidden");

  // Reset state
  isInCall = false;
  isMuted = false;
  voiceMuteBtn.textContent = "Mute";
  voiceMuteBtn.classList.remove("bg-gray-400");

  // Collapse panel when leaving
  if (isPanelExpanded) {
    isPanelExpanded = false;
    voicePanelContent.classList.add("hidden");
    voiceToggleIcon.src = "/images/help-group/icon-down.svg";
    voiceToggleIcon.alt = "Expand";
  }

  // Update panel to show "call ongoing" if others are still in
  // The socket event will trigger updateCallStatus which will:
  // 1. Show "Voice call ongoing" if call is still active
  // 2. Show join button
  // 3. Hide panel if call ended (no more participants)
}

/**
 * Create peer connection with another user
 */
async function createPeerConnection(socketId, username, userId, initiator) {
  console.log(
    `Creating peer connection with ${username} (${socketId}), initiator: ${initiator}`
  );

  // Create new RTCPeerConnection
  const peerConnection = new RTCPeerConnection(configuration);

  // Add local stream to peer connection
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("voice-ice-candidate", {
        candidate: event.candidate,
        target: socketId,
      });
    }
  };

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    console.log("Received remote track from:", socketId);
    handleRemoteStream(socketId, event.streams[0]);
  };

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log(
      `Connection state with ${socketId}:`,
      peerConnection.connectionState
    );

    if (
      peerConnection.connectionState === "failed" ||
      peerConnection.connectionState === "disconnected"
    ) {
      removeParticipant(socketId);
    }
  };

  // Store peer connection
  peerConnections.set(socketId, peerConnection);

  // Add participant to UI
  addParticipant(socketId, username, userId);

  // If initiator, create and send offer
  if (initiator) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("voice-offer", {
      offer: offer,
      target: socketId,
    });
  }
}

/**
 * Handle remote audio stream
 */
function handleRemoteStream(socketId, stream) {
  let participant = participants.get(socketId);

  if (!participant) {
    return;
  }

  // Create or update audio element
  if (!participant.audioElement) {
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    participant.audioElement = audioElement;
    participants.set(socketId, participant);
  } else {
    participant.audioElement.srcObject = stream;
  }

  // Add audio level detection for visual feedback
  detectAudioLevel(socketId, stream);
}

/**
 * Detect audio level for visual feedback
 */
function detectAudioLevel(socketId, stream) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.fftSize = 256;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function checkAudioLevel() {
    const participant = participants.get(socketId);
    if (!participant) return;

    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    const participantElement = document.querySelector(
      `[data-voice-socket-id="${socketId}"]`
    );
    if (participantElement) {
      const statusIndicator = participantElement.querySelector(
        ".voice-status-indicator"
      );
      if (average > 20) {
        statusIndicator?.classList.remove("bg-green-400");
        statusIndicator?.classList.add("bg-yellow-400");
      } else {
        statusIndicator?.classList.remove("bg-yellow-400");
        statusIndicator?.classList.add("bg-green-400");
      }
    }

    requestAnimationFrame(checkAudioLevel);
  }

  checkAudioLevel();
}

/**
 * Add self to participants list
 */
function addSelfToParticipants() {
  const currentUsername = window.__CURRENT_USER__;
  const clone = participantTemplate.content.cloneNode(true);

  const container = clone.querySelector(".voice-participant");
  container.setAttribute("data-voice-socket-id", "self");

  const avatar = clone.querySelector(".voice-participant-avatar");
  const initials = getInitialsSafe(currentUsername);
  const color = getAvatarColor(currentUsername);
  avatar.textContent = initials;
  avatar.style.backgroundColor = color;

  const name = clone.querySelector(".voice-participant-name");
  name.textContent = currentUsername + " (You)";

  voiceParticipantsList.appendChild(clone);
}

/**
 * Add participant to UI
 */
function addParticipant(socketId, username, userId) {
  if (participants.has(socketId)) {
    return;
  }

  participants.set(socketId, { userId, username, audioElement: null });

  const clone = participantTemplate.content.cloneNode(true);

  const container = clone.querySelector(".voice-participant");
  container.setAttribute("data-voice-socket-id", socketId);

  const avatar = clone.querySelector(".voice-participant-avatar");
  const initials = getInitialsSafe(username);
  const color = getAvatarColor(username);
  avatar.textContent = initials;
  avatar.style.backgroundColor = color;

  const name = clone.querySelector(".voice-participant-name");
  name.textContent = username;

  voiceParticipantsList.appendChild(clone);
}

/**
 * Remove participant
 */
function removeParticipant(socketId) {
  // Close peer connection
  const peerConnection = peerConnections.get(socketId);
  if (peerConnection) {
    peerConnection.close();
    peerConnections.delete(socketId);
  }

  // Remove audio element
  const participant = participants.get(socketId);
  if (participant && participant.audioElement) {
    participant.audioElement.srcObject = null;
  }

  participants.delete(socketId);

  // Remove from UI
  const participantElement = document.querySelector(
    `[data-voice-socket-id="${socketId}"]`
  );
  if (participantElement) {
    participantElement.remove();
  }
}

/**
 * Toggle mute
 */
function toggleMute() {
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    isMuted = !isMuted;
    audioTrack.enabled = !isMuted;

    voiceMuteBtn.textContent = isMuted ? "Unmute" : "Mute";
    if (isMuted) {
      voiceMuteBtn.classList.add("bg-gray-400");
    } else {
      voiceMuteBtn.classList.remove("bg-gray-400");
    }
  }
}

/**
 * Update connection status
 */
function updateConnectionStatus(status) {
  if (status === "connected") {
    voiceConnectionStatus.textContent = "Connected";
    voiceConnectionStatus.className =
      "mb-3 rounded-lg bg-green-500/30 px-3 py-2 text-center font-poppins text-xs font-semibold text-white";
  } else if (status === "connecting") {
    voiceConnectionStatus.textContent = "Connecting...";
    voiceConnectionStatus.className =
      "mb-3 rounded-lg bg-white/20 px-3 py-2 text-center font-poppins text-xs font-semibold text-white";
  } else {
    voiceConnectionStatus.textContent = "Connection Error";
    voiceConnectionStatus.className =
      "mb-3 rounded-lg bg-red-500/30 px-3 py-2 text-center font-poppins text-xs font-semibold text-white";
  }
}
