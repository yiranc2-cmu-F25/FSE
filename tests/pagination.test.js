import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePositiveInt,
  getPage,
  getLimit,
} from "./../utils/speedTest/pagination.js";

describe("Pagination Utils", () => {
  describe("parsePositiveInt", () => {
    test("returns undefined for undefined input", () => {
      expect(parsePositiveInt(undefined)).toBeUndefined();
    });
    test("returns undefined for null input", () => {
      expect(parsePositiveInt(null)).toBeUndefined();
    });
    test("returns undefined for non-numeric input", () => {
      expect(parsePositiveInt("abc")).toBeUndefined();
    });
    test("returns undefined for non-integer input", () => {
      expect(parsePositiveInt(3.14)).toBeUndefined();
    });
    test("returns undefined for negative input", () => {
      expect(parsePositiveInt(-5)).toBeUndefined();
    });
    test("return undefined for infinite number", () => {
      expect(parsePositiveInt(Infinity)).toBeUndefined();
    });
    test("returns undefined for zero input", () => {
      expect(parsePositiveInt(0)).toBeUndefined();
    });
    test("returns the number for valid positive integer input", () => {
      expect(parsePositiveInt(10)).toBe(10);
    });
  });
  describe("getPage", () => {
    test("returns default page when query.page is undefined", () => {
      expect(getPage({}, 2)).toBe(2);
    });
    test("returns default page when query.page is invalid", () => {
      expect(getPage({ page: "abc" }, 3)).toBe(3);
    });
    test("returns the parsed page number for valid input", () => {
      expect(getPage({ page: "5" }, 1)).toBe(5);
    });
    test("should return DEFAULT PAGE when fallback not specified", () => {
      expect(getPage({})).toBe(DEFAULT_PAGE);
    });
  });
  describe("getLimit", () => {
    test("returns default limit when query.limit is undefined", () => {
      expect(getLimit({}, 30)).toBe(30);
    });
    test("returns default limit when query.limit is invalid", () => {
      expect(getLimit({ limit: "xyz" }, 40)).toBe(40);
    });
    test("returns the parsed limit number for valid input within max", () => {
      expect(getLimit({ limit: "25" }, 50, 100)).toBe(25);
    });
    test("returns max limit when parsed limit exceeds max", () => {
      expect(getLimit({ limit: "150" }, 50, 100)).toBe(100);
    });
    test("returns 1 when parsed limit is less than 1", () => {
      expect(getLimit({ limit: "-10" }, 50, 100)).toBe(50);
    });
    test("should return DEFAULT LIMIT when fallback not specified", () => {
      expect(getLimit({})).toBe(DEFAULT_LIMIT);
    });
    test("should return MAX LIMIT when limit exceeds max and max not specified", () => {
      expect(getLimit({ limit: "500" }, 50)).toBe(MAX_LIMIT);
    });
  });
});
