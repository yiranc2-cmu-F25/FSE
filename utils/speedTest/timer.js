// Factory function: Execution an async Fn and time the execution time
export function timeAsyncFunction(fn) {
  return async (...args) => {
    const t0 = process.hrtime.bigint();
    const fnOutcome = await fn(...args);
    const t1 = process.hrtime.bigint();
    const serverElapsedMs = Number(t1 - t0) / 1e6; // 10 ^ 6 -> 1,000,000
    return {
      fnOutcome,
      serverElapsedMs,
    };
  };
}
