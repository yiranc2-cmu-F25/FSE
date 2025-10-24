import { getSocket } from "../utils/socket.js";

document.addEventListener('DOMContentLoaded', () => {
    const durationEl  = document.getElementById('duration');
    const postsPerSecEl = document.getElementById('post');
    const getsPerSecEl  = document.getElementById('get');
    const okayBtn       = document.getElementById('okayBtn');

    const sock = getSocket();
    if (sock && !sock.connected) {
        try {
            sock.connect();
            sock.on?.("connect", () => console.log("[status] socket connected", sock.id));
            sock.on?.("connect_error", (e) => console.warn("[status] connect_error", e?.message || e));
        } catch (e) {
            console.error("[status] connect() failed", e);
        }
    }

    // Try to get summary from sessionStorage
    let summary = null;
    try {
        summary = JSON.parse(sessionStorage.getItem('esnSpeedTestSummary') || 'null');
    } catch (_) {
        summary = null;
    }

    if (!summary) {
        // If user hit report directly (no session data), you can:
        // 1) redirect back, or 2) show a friendly message.
        alert('No report data found. Please run a speed test first.');
        window.location.href = '/speed-test';
        return;
    }

    console.log('Speed Test Summary Data:', summary);

    // Expected fields from /stop response:
    // { postCount, getCount, durationMs, intervalMs, postRps, getRps, runId, ... }
    const s = summary.summary || {};

    const postCount  = Number(s.postCount || 0);
    const getCount   = Number(s.getCount  || 0);
    const durationMs = Number(s.durationMs || 0);

    const durationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;

    // Compute RPS if backend didn’t provide them
    const postsPerSec = durationSec > 0 ? +(postCount / durationSec * 2).toFixed(2) : 0;
    const getsPerSec  = durationSec > 0 ? +(getCount  / durationSec * 2).toFixed(2) : 0;

    // Populate UI
    durationEl.textContent      = durationSec ?? '—';
    postsPerSecEl.textContent   = postsPerSec;
    getsPerSecEl.textContent    = getsPerSec;

    // OK button → clear & go back (or to home)
    okayBtn.addEventListener('click', () => {
        try { sessionStorage.removeItem('esnSpeedTestSummary'); } catch (_) {}
        window.location.href = '/speed-test';
    });
});
