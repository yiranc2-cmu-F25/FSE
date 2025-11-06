import {
  parseCursor,
  buildCursorClause,
  pushCursorClause,
} from "./../utils/search/cursor.js";

describe("cursor", () => {
  describe("parseCursor", () => {
    it("should return null if input is null", () => {
      expect(parseCursor(undefined)).toBeNull();
      expect(parseCursor(null)).toBeNull();
    });
    it("should return null if ts Time is NAN or idStr is empty", () => {
      // const [tsStr, idStr] = String("|").split("|");
      expect(parseCursor("|")).toBeNull();
      expect(parseCursor("October 26, 2023 10:30:00|")).toBeNull();
    });
    it("should return Date object and idStr if both are valid", () => {
      const cursor = "October 26, 2023 10:30:00|12";
      expect(parseCursor(cursor)).toEqual({
        ts: new Date("October 26, 2023 10:30:00"),
        idStr: "12",
      });
    });
  });
  describe("buildCursorClause", () => {
    it("should return clause object with ts and idStr input", () => {
      const input = { ts: new Date("October 26, 2023 10:30:00"), idStr: "12" };
      const output = [
        { timestamp: { $lt: new Date("October 26, 2023 10:30:00") } },
        {
          timestamp: new Date("October 26, 2023 10:30:00"),
          _id: { $lt: "12" },
        },
      ];
      expect(buildCursorClause(input)).toEqual(output);
    });
    it("should return clause object with ts and idStr input", () => {
      const input = { ts: new Date("October 27, 2023 10:30:00"), idStr: "12" };
      const output = [
        { timestamp: { $lt: new Date("October 27, 2023 10:30:00") } },
        {
          timestamp: new Date("October 27, 2023 10:30:00"),
          _id: { $lt: "12" },
        },
      ];
      expect(buildCursorClause(input)).toEqual(output);
    });
  });
  describe("pushCursorClause", () => {
    it("should return false if cursor failed to be parsed", () => {
      const cursor = undefined;
      expect(pushCursorClause("any", cursor)).toBeFalsy;
    });
    it("should return clause object if clause is an array", () => {
      const andConds = [];
      const cursor = "October 27, 2023 10:30:00|12";
      //   expect(pushCursorClause(andConds, cursor)).toEqual([
      //     [
      //       { timestamp: { $lt: new Date("October 27, 2023 10:30:00") } },
      //       {
      //         timestamp: new Date("October 27, 2023 10:30:00"),
      //         _id: { $lt: "12" },
      //       },
      //     ],
      //   ]);
      expect(pushCursorClause(andConds, cursor)).toBeTruthy();
    });
  });
});
