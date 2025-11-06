import { timeAsyncFunction } from "./../utils/speedTest/timer.js";

// The async timer wrapper should return 1. async function elapsed time and 2. async func result

describe("timeAsyncFunction", () => {
  it("should return the elapsed time and result of an async function", async () => {
    const asyncFunction = async () => {
      const result = await new Promise((resolve) =>
        setTimeout(() => {
          resolve("This is the result of aync function!");
        }, 100),
      );
      return result;
    };

    const timerWrappedFunction = await timeAsyncFunction(asyncFunction);
    const { fnOutcome, serverElapsedMs } = await timerWrappedFunction();
    expect(serverElapsedMs).toBeGreaterThanOrEqual(97);
    expect(fnOutcome).toBe("This is the result of aync function!");
  });
  it("should return the elapsed time and result of any async function", async () => {
    const asyncFunction = async () => {
      const result = await new Promise((resolve) =>
        setTimeout(() => {
          resolve("This is the result of ANY aync function!");
        }, 50),
      );
      return result;
    };

    const timerWrappedFunction = await timeAsyncFunction(asyncFunction);
    const { fnOutcome, serverElapsedMs } = await timerWrappedFunction();
    expect(serverElapsedMs).toBeGreaterThanOrEqual(50);
    expect(fnOutcome).toBe("This is the result of ANY aync function!");
  });
});
