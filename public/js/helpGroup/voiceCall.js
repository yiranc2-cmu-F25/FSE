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

// DOM Elements
const voiceCallModal = document.getElementById("voice-call-modal");
const voiceCallBtn = document.getElementById("voice-call-btn");
const voiceCloseBtn = document.getElementById("voice-close-btn");
const voiceMuteBtn = document.getElementById("voice-mute-btn");
const voiceLeaveBtn = document.getElementById("voice-leave-btn");
const voiceParticipantsList = document.getElementById("voice-participants-list");
const voiceConnectionStatus = document.getElementById("voice-connection-status");
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
  voiceCloseBtn?.addEventListener("click", leaveVoiceCall);
  voiceMuteBtn?.addEventListener("click", toggleMute);
  voiceLeaveBtn?.addEventListener("click", leaveVoiceCall);

  // Socket event listeners for WebRTC signaling
  setupSocketListeners();
}

/**
 * Setup Socket.IO listeners for WebRTC signaling
 */
function setupSocketListeners() {
  // Handle user joined
  socket.on("voice-user-joined", async (data) => {
    if (data.groupId !== currentGroupId || !isInCall) return;

    console.log("Voice user joined:", data);
    await createPeerConnection(data.socketId, data.username, data.userId, true);
  });

  // Handle WebRTC offer
  socket.on("voice-offer", async (data) => {
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
  });

  // Handle WebRTC answer
  socket.on("voice-answer", async (data) => {
    if (!isInCall) return;

    console.log("Received voice answer from:", data.from);
    const peerConnection = peerConnections.get(data.from);

    if (peerConnection) {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    }
  });

  // Handle ICE candidate
  socket.on("voice-ice-candidate", async (data) => {
    if (!isInCall) return;

    const peerConnection = peerConnections.get(data.from);

    if (peerConnection && data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  // Handle user left
  socket.on("voice-user-left", (data) => {
    if (data.groupId !== currentGroupId || !isInCall) return;

    console.log("Voice user left:", data);
    removeParticipant(data.socketId);
  });
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
    const response = await fetch("/api/calls/join", {
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

    // Show modal
    voiceCallModal.classList.remove("hidden");
    voiceCallModal.classList.add("flex");

    // Update status
    updateConnectionStatus("connected");

    // Add self to participants
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
    await fetch("/api/calls/leave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupId: currentGroupId,
      }),
    });

    // Cleanup
    cleanup();
  } catch (error) {
    console.error("Error leaving voice call:", error);
    // Cleanup anyway
    cleanup();
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

  // Hide modal
  voiceCallModal.classList.add("hidden");
  voiceCallModal.classList.remove("flex");

  // Reset state
  isInCall = false;
  isMuted = false;
  voiceMuteBtn.textContent = "Mute";
  voiceMuteBtn.classList.remove("bg-gray-400");
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
      "mb-4 rounded-lg bg-green-500/30 px-3 py-2 text-center font-poppins text-sm font-semibold text-white";
  } else if (status === "connecting") {
    voiceConnectionStatus.textContent = "Connecting...";
    voiceConnectionStatus.className =
      "mb-4 rounded-lg bg-white/20 px-3 py-2 text-center font-poppins text-sm font-semibold text-white";
  } else {
    voiceConnectionStatus.textContent = "Connection Error";
    voiceConnectionStatus.className =
      "mb-4 rounded-lg bg-red-500/30 px-3 py-2 text-center font-poppins text-sm font-semibold text-white";
  }
}
