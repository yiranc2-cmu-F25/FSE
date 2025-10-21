import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { getLimit, getPage } from "./../utils/speedTest/pagination.js";
import {
  createSpeedTestCollection,
  dropSpeedTestCollection,
  insertSpeedTestMsg,
  readSpeedTestMessages,
} from "./../data/speedTestTempDB.js";
import { timeAsyncFunction } from "./../utils/speedTest/timer.js";

// HTTP ERROR Codes
// 409 Conflict: Conflict with current server state
// 422 Unprocessable Entity: Incorrect req input. The client should not repeat this request without modification.
const speedTestStateEnum = {
  IDLE: "IDLE",
  POSTING: "POSTING",
  GETTING: "GETTING",
  STOPING: "STOPPING",
};
export const speedTestState = {
  active: false,
  state: speedTestStateEnum.IDLE,
  postCount: 0,
  getCount: 0,
};

const POSTLIMIT = 1000;

const updateSpeedTestStateToStart = (speedTestId, durationSec, intervalMs) => {
  speedTestState.active = true;
  speedTestState.state = speedTestStateEnum.POSTING;
  speedTestState.speedTestId = speedTestId;
  speedTestState.startTime = Date.now();
  speedTestState.durationMs = durationSec * 1000;
  speedTestState.intervalMs = intervalMs;
  speedTestState.postCount = 0;
  speedTestState.getCount = 0;
  speedTestState.speedTestName = `ESN-Speed-Test-${speedTestId}`;
};
const updateSpeedTestStateToIdle = () => {
  speedTestState.active = false;
  speedTestState.state = speedTestStateEnum.IDLE;
  speedTestState.speedTestId = undefined;
  speedTestState.speedTestName = undefined;
};

// Verify the request has a valid speed-test-id header
export const requireSpeedTest = function (req, res) {
  const speedTestId = req.header("speed-test-id");
  if (!speedTestId || speedTestId !== speedTestState.speedTestId) {
    res.status(404).json({ error: "Speed test not found" });
    return null;
  }
  return speedTestId;
};
// POST to /speed-test/start to start a new speed test
export async function startSpeedTest(req, res) {
  console.log("Starting new speed test...");
  // Only one speed test at a time; Return conflict if already active
  if (speedTestState.active) {
    console.log(speedTestState);
    return res.status(409).json({
      errorMessage: "Speed test already in progress",
      errorStatus: "SPEED_TEST_IN_PROGRESS",
      errorCode: 409,
    });
  }
  // Validate input parameters:
  // Both duration and interval must be positive integers
  // TODO: Frontend must sanitize and convert input to numbers before sending
  const { durationSec, intervalMs } = req.body ?? {};
  if (
    typeof durationSec !== "number" ||
    typeof intervalMs !== "number" ||
    durationSec <= 0 ||
    intervalMs <= 0
  ) {
    return res.status(400).json({
      errorMessage:
        "Invalid Input Parameters: durationSec and intervalMs must be positive numbers",
      errorStatus: "INVALID_TEST_INPUT_PARAMETERS",
      errorCode: 400,
    });
  }
  const speedTestId = uuid();
  // Update global speed test state
  updateSpeedTestStateToStart(speedTestId, durationSec, intervalMs);
  // create (or reset) the per-run collection
  const { serverElapsedMs } = await timeAsyncFunction(
    createSpeedTestCollection,
  );

  return res.status(201).json({
    speedTestId,
    ESNTestStatus: speedTestState.state,
    message:
      "Speed Test Started Successfully. Use speed-test-id header for subsequent requests.",
    creationTime: serverElapsedMs,
  });
}

// POST one msg to Server during POST phase
export async function postToSpeedTest(req, res) {
  const speedTestId = requireSpeedTest(req, res);
  if (!speedTestId) return;
  if (speedTestState.state !== "POSTING") {
    res.status(409).json({
      errorMessage: "Try to post message while Speed test not in POST phase",
      errorStatus: "SPEED_TEST_PHASE_ERROR",
      errorCode: 409,
    });
    return null;
  }
  const { payload } = req.body ?? {};
  if (typeof payload !== "string" || payload.length != 20) {
    return res.status(422).json({
      errorMessage:
        "POST msg during ESN Speed Test should be exactly 20-char long string.",
      errorStatus: "SPEED_TEST_POST_INPUT_ERROR",
      errorCode: 422,
    });
  }
  const { serverElapsedMs } = await timeAsyncFunction(insertSpeedTestMsg)(
    speedTestId,
    payload,
  );
  speedTestState.postCount += 1;
  if (speedTestState.postCount > POSTLIMIT) {
    speedTestState.state = "STOPPING";
    return res.status(429).json({
      errorMessage: `Cannot send more than ${POSTLIMIT} msg in POST phase`,
      errorStatus: "SPEED_TEST_POST_LIMIT_ERROR",
      errorCode: 429,
      limit: POSTLIMIT,
    });
  }
  return res.status(200).json({ ok: true, serverElapsedMs });
}

// GET one msg from Server during POST phase
// GET to /speedtest/messages
export async function getFromSpeedTest(req, res) {
  // verify speedId header
  const speedTestId = requireSpeedTest(req, res);
  if (!speedTestId) return; // TODO: better informative?
  if (speedTestState.state !== "GETTING") {
    return res.status(409).json({
      errorMessage: "Try to get message while Speed test not in GET phase",
      errorStatus: "SPEED_TEST_PHASE_ERROR",
      errorCode: 409,
    });
  }

  const page = getPage(req.query);
  const limit = getLimit(req.query);
  // TODO: read from test db in step 3
  const { fnOutcome, serverElapsedMs } = await timeAsyncFunction(
    readSpeedTestMessages,
  )(speedTestId, page, limit);
  speedTestState.getCount += 1;
  return res.status(200).json({
    ok: true,
    ...fnOutcome, // {fecthedItems, docTotal, hasNext}
    page,
    limit,
    serverElapsedMs,
  });
}

// POST to /speedtest/next-phase to switch from POST to GET phase
export async function switchTestPhase(req, res) {
  const speedTestId = requireSpeedTest(req, res);
  if (!speedTestId) return;
  if (speedTestState.state !== speedTestStateEnum.POSTING)
    return res.status(409).json({
      errorMessage: "Try to switch phase while Speed test not in POST phase",
      errorStatus: "SPEED_TEST_PHASE_ERROR",
      errorCode: 409,
    });

  speedTestState.state = speedTestStateEnum.GETTING;
  return res.status(200).json({
    ok: true,
    status: speedTestState.state,
    message: "Switched to GET phase",
  });
}
// POST to /speedtest/stop to stop a speed test
export async function stopSpeedTest(req, res) {
  const speedTestId = requireSpeedTest(req, res);
  if (!speedTestId) return;
  console.log("Turning down speed test...");
  speedTestState.state = speedTestStateEnum.STOPPING;
  // TODO: drop db collection in step 3
  await timeAsyncFunction(dropSpeedTestCollection)(speedTestId);
  const summary = writeSpeedTestSummary(speedTestState);
  updateSpeedTestStateToIdle();

  return res.status(200).json({
    ok: true,
    speedTestStatus: speedTestState.state,
    message: "Speed test stopped and test data dropped.",
    summary,
  });
}

export function getSpeedTestStatus(req, res) {
  const { active, state, speedTestId, postCount, getCount, startedAt } =
    speedTestState;

  return res
    .status(200)
    .json({ active, state, speedTestId, postCount, getCount, startedAt });
}
function writeSpeedTestSummary(speedTestState) {
  const summary = {
    runId: speedTestState.speedTestId,
    postCount: speedTestState.postCount,
    getCount: speedTestState.getCount,
    durationMs: speedTestState.durationMs,
    intervalMs: speedTestState.intervalMs,
  };
  return summary;
}
