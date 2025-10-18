import { speedTestState } from "../controllers/speedTestController.js";

const DEFAULT_ALLOWLIST = ["/speed-test"];

export function blockWhenSpeedTest(options = {}) {
  const {
    allowList = DEFAULT_ALLOWLIST,
    blockingEnabled = process.env.SPEED_TEST_BLOCK_ENABLED !== "false",
    statusCode = 503,
  } = options;
  return function speedTestBlocker(req, res, next) {
    // 1. If not in explicitly server block session
    if (!blockingEnabled) {
      return next();
    }
    // 2. If no ongoing speed test
    if (!speedTestState.active) {
      return next();
    }
    // 3. If url has prefix as /speed-test
    const reqPath = req.path || req.url || "";
    if (allowList.some((prefix) => reqPath.startsWith(prefix))) {
      return next();
    }
    // Otherwise, block requrest
    return res.format({
      html: () => {
        res.render("errorPages/503-serviceUnavailable", {
          reason: "Performance test in progress",
        });
      },
      json: () => {
        res.status(statusCode).json({
          error: "SPEED_TEST_ACTIVE",
          message: "Service is temporarily unavailable during speed test.",
        });
      },

      default: () =>
        res
          .type("txt")
          .send("Service Unavailable (performance test in progress)"),
    });
    // return res.status(statusCode).json({
    //   error: "SPEED_TEST_ACTIVE",
    //   message: "Service is temporarily unavailable during speed test.",
    // });
  };
}
