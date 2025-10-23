import { getSocket } from "../utils/socket.js";

document.addEventListener('DOMContentLoaded', () => {
    const startBtn       = document.getElementById('startTestBtn');
    const stopBtn        = document.getElementById('stopTestBtn');
    const durationInput  = document.getElementById('durationSeconds');
    const intervalInput  = document.getElementById('intervalMs');
    const modal          = document.getElementById('runningModal');
    const remainingEl    = document.getElementById('remaining');
    const intervalEl     = document.getElementById('interval');
    const spinner        = document.getElementById('spinner');
    const failureBanner  = document.getElementById('failureBanner');

    // ---- constants per spec ----
    const MAX_POSTS      = 1000;
    const PAYLOAD_LEN    = 20;

    // ---- state ----
    let speedTestId      = null;
    let postTimer        = null;
    let countdownTimer   = null;
    let testAborted      = false;
    let exceededMaxPosts  = false;

    const sock = getSocket();
    if (sock && !sock.connected) {
        try {
            sock.connect();
            sock.on?.("connect", () => console.log("[speedTest] socket connected", sock.id));
            sock.on?.("connect_error", (e) => console.warn("[speedTest] connect_error", e?.message || e));
        } catch (e) {
            console.error("[speedTest] connect() failed", e);
        }
    }

    // ---- helpers ----
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const nowMs = () => Date.now();

    const genPayload20 = () => {
        // Ensure EXACTLY 20 chars
        const s = Math.random().toString(36).slice(2);
        return (s + 'xxxxxxxxxxxxxxxxxxxx').slice(0, PAYLOAD_LEN);
    };

    const withHeaders = (init = {}) => ({
        ...init,
        headers: {
            ...(init.headers || {}),
            'Content-Type': 'application/json',
            ...(speedTestId ? { 'speed-test-id': speedTestId } : {}),
        },
    });

    function openModal(durationSec, intervalMs) {
        remainingEl.textContent = String(durationSec);
        intervalEl.textContent  = String(intervalMs);
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        // UI countdown (visual only)
        let remaining = durationSec;
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
            remaining = Math.max(0, remaining - 1);
            remainingEl.textContent = String(remaining);
            if (remaining === 0) clearInterval(countdownTimer);
        }, 1000);
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        if (postTimer) clearInterval(postTimer);
        if (countdownTimer) clearInterval(countdownTimer);
    }

    // ---- API wrappers ----
    async function startTest(durationSec, intervalMs) {
        const res = await fetch('/speed-test/start', withHeaders({
            method: 'POST',
            body: JSON.stringify({ durationSec, intervalMs }),
        }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.errorMessage || `Start failed (${res.status})`);
        speedTestId = data.speedTestId;
        return data;
    }

    async function postOneMessage() {
        const res = await fetch('/speed-test/messages', withHeaders({
            method: 'POST',
            body: JSON.stringify({ payload: genPayload20() }),
        }));
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.errorMessage || `POST failed (${res.status})`);
        }
    }

    async function switchToGetPhase() {
        const res = await fetch('/speed-test/next-phase', withHeaders({ method: 'POST' }));
        if (!res.ok) throw new Error(`Switch phase failed (${res.status})`);
    }

    async function fetchMessagesPage(page, limit) {
        const res = await fetch(`/speed-test/messages?page=${page}&limit=${limit}`, withHeaders());
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`GET messages failed (${res.status})`);
        return data; // expects { hasNext, fecthedItems, ... }
    }

    async function stopTest() {
        const res = await fetch('/speed-test/stop', withHeaders({ method: 'POST' }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`Stop failed (${res.status})`);
        return data; // includes summary { postCount, getCount, durationMs, intervalMs, ... }
    }

    // ---- Phases ---- //

    /**
     * POST Phase — send test messages at a fixed interval until
     *   - time budget expires, OR
     *   - MAX_POSTS reached, OR
     *   - server returns an error (e.g., 429 / phase mismatch)
     */
    async function runPostPhase(intervalMs, budgetMs) {
        const endTime = nowMs() + budgetMs;
        let postCount = 0;

        while (nowMs() < endTime && postCount < MAX_POSTS && !testAborted) {
            try {
                await postOneMessage();
                postCount++;
            } catch (err) {
                console.warn(`[POST] Error after ${postCount} messages:`, err.message);
                break; // stop early on failure
            }

            // Wait for next interval, but don't overshoot time budget
            const remaining = endTime - nowMs();
            if (remaining <= 0) break;
            await sleep(Math.min(intervalMs, remaining));
        }

        if (postCount >= MAX_POSTS) {
            console.warn(`[POST] Reached maximum of ${MAX_POSTS} messages.`);
            exceededMaxPosts = true;
        }

        console.log(`[POST] Completed ${postCount} messages in ${(budgetMs / 1000).toFixed(2)}s`);
        return postCount;
    }

    /**
     * GET Phase — repeatedly fetch messages (page=1, limit=1) at the same interval
     * until the phase’s time budget expires.
     */
    async function runGetPhase(intervalMs, budgetMs) {
        const endTime = nowMs() + budgetMs;
        let getCount = 0;

        while (nowMs() < endTime && !testAborted && !exceededMaxPosts) {
            try {
                await fetchMessagesPage(1, 1);
                getCount++;
            } catch (err) {
                console.warn(`[GET] Error after ${getCount} reads:`, err.message);
                break;
            }

            // Wait for next interval, respecting remaining time
            const remaining = endTime - nowMs();
            if (remaining <= 0) break;
            await sleep(Math.min(intervalMs, remaining));
        }

        console.log(`[GET] Completed ${getCount} fetches in ${(budgetMs / 1000).toFixed(2)}s`);
        return getCount;
    }

    // ---- Main button ----
    startBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const durationSec = parseInt(durationInput.value, 10);
        const intervalMs  = parseInt(intervalInput.value, 10);
        if (!(durationSec > 0) || !(intervalMs > 0)) return;

        // Open modal + set interval label
        openModal(durationSec, intervalMs);

        // Global deadline to enforce total runtime ~= durationSec (±5s handled by small buffers)
        const globalEndAt = nowMs() + durationSec * 1000;

        // Split 50/50
        const postMs = Math.floor((durationSec * 1000) / 2);
        const getMs  = durationSec * 1000 - postMs;

        try {
            // 1) Start test
            await startTest(durationSec, intervalMs);

            // 2) POST phase (honor interval, stop at 1000 or time budget)
            await runPostPhase(intervalMs, postMs);

            // 3) Switch to GET phase
            await switchToGetPhase();

            // 4) GET phase (page until time budget or no more pages)
            // Make sure we don’t exceed the global deadline
            const timeLeftForGet = Math.max(0, Math.min(getMs, globalEndAt - nowMs()));
            await runGetPhase(intervalMs, timeLeftForGet);

            // 5) Stop & summarize (official result)
            const summary = await stopTest();

            // Pass summary to the report page (client-side)
            if (testAborted) {
                closeModal();
                window.location.href = '/speed-test';
            } else if (exceededMaxPosts) {
                clearInterval(countdownTimer);
                spinner.classList.add('hidden');
                failureBanner.classList.remove('hidden');
            } else {
                closeModal();
                sessionStorage.setItem('esnSpeedTestSummary', JSON.stringify(summary));
                window.location.href = '/speed-test/reports';
                console.log('Speed Test Summary:', summary);
            }

        } catch (err) {
            console.error(err);
            closeModal();
            alert(err.message || 'Speed test failed.');
            // Best-effort cleanup
            await stopTest();
        }
    });

    // ---- Stop button ----
    stopBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        testAborted = true;        
    });
});
