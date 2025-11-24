// tests/search.test.js
import { parseQuery } from "../utils/search/parseQuery.js";
import {
  STOP_WORDS,
  splitTokensForStopwords,
  buildSubstringRegex,
  escapeRegExp,
  cleanToken,
} from "../utils/search/search.js";

describe("Search Utils", () => {
  describe("cleanToken", () => {
    test("should remove non-digit and non-alpha chars from both ends", () => {
      expect(cleanToken("  --hello--   ")).toBe("hello");
      expect(cleanToken("!!!world!!!")).toBe("world");
      expect(cleanToken("...example...")).toBe("example");
      expect(cleanToken(undefined)).toBe("");
    });
  });
  describe("parseQuery", () => {
    test("handles empty query string", () => {
      const req = { query: {} };
      const result = parseQuery(req, { requireContent: false });
      expect(result).toEqual({ raw: "", nonStop: [] });
    });

    test("requires content when requireContent is true", () => {
      const req = { query: {} };
      const result = parseQuery(req, { requireContent: true });
      expect(result).toHaveProperty("early");
      expect(result.early.code).toBe(400);
    });

    test("filters out stop words", () => {
      const req = { query: { content: "the quick brown fox" } };
      const result = parseQuery(req);
      expect(result.nonStop).toEqual(["quick", "brown", "fox"]);
    });

    test("returns early when only stop words provided", () => {
      const req = { query: { content: "the and or" } };
      const result = parseQuery(req);
      expect(result).toHaveProperty("early");
      expect(result.early.code).toBe(200);
      expect(result.early.count).toBe(0);
    });

    test("preserves case when toLower is false", () => {
      const req = { query: { content: "Quick Brown FOX" } };
      const result = parseQuery(req, { toLower: false });
      expect(result.nonStop).toEqual(["quick", "brown", "fox"]);
    });
  });
  describe("splitTokensForStopwords (covers cleanToken too)", () => {
    test("trims punctuation at both ends tokens", () => {
      expect(splitTokensForStopwords("  --hello--   wo,rld!!  ")).toEqual([
        "hello",
        "wo,rld",
      ]);
    });

    test("keeps Unicode letters and numbers", () => {
      expect(splitTokensForStopwords("Café 123 中文")).toEqual([
        "café",
        "123",
        "中文",
      ]);
      expect(splitTokensForStopwords("nkjjn nmlnknm nkmlnm, ")).toEqual([
        "nkjjn",
        "nmlnknm",
        "nkmlnm",
      ]);
      expect(
        splitTokensForStopwords("Ccxcascas7bjh nkjnm nkjn,joijlj"),
      ).toEqual(["ccxcascas7bjh", "nkjnm", "nkjn,joijlj"]);
      expect(splitTokensForStopwords("I love you Honey!")).toEqual([
        "i",
        "love",
        "you",
        "honey",
      ]);
      expect(
        splitTokensForStopwords("Morning Shenzhen !!!!!!!!!nnjbn!!!!!   "),
      ).toEqual(["morning", "shenzhen", "nnjbn"]);
    });

    test("filters empty tokens (proves .filter(Boolean) is needed)", () => {
      // without .filter(Boolean) this would return ["", "", ""]
      expect(splitTokensForStopwords("   \n\t   ,,,   !!! ")).toEqual([]);
    });

    test("handles empty/undefined input", () => {
      expect(splitTokensForStopwords()).toEqual([]);
      expect(splitTokensForStopwords("")).toEqual([]);
    });
  });

  describe("escapeRegExp", () => {
    test("escapes all metacharacters so the string can be used literally", () => {
      const s = ".*+?^${}()|[]\\";
      const escaped = escapeRegExp(s);
      expect(escaped).not.toBe(s);
      // Should compile and match the original string literally
      expect(() => new RegExp(escaped)).not.toThrow();
      expect(new RegExp(escaped).test(s)).toBe(true);
      // and not accidentally match a different shape
      expect(new RegExp(escaped).test("cat.dog")).toBe(false);
    });

    test("handles undefined safely", () => {
      expect(escapeRegExp()).toBe("");
    });
  });

  describe("buildSubstringRegex", () => {
    test("uses provided terms, escapes them, and is case-insensitive", () => {
      const re = buildSubstringRegex(["Cat", "d.g"]); // dot must be literal
      expect(re.flags).toContain("i");
      expect(re.test("a cat here")).toBe(true);
      expect(re.test("dog")).toBe(false);
      expect(re.test("I saw d.g today")).toBe(true);
      expect(re.test("I saw dXg today")).toBe(false);
    });

    test("falls back to phrase when terms is empty (covers ternary branch)", () => {
      const re = buildSubstringRegex([], "MiX.Ed");
      // phrase is lower-cased and escaped; dot is literal, not wildcard
      expect(re.test("mix.ed case")).toBe(true);
      expect(re.test("mixed case")).toBe(false);
    });

    test("supports characters that need escaping and alternation", () => {
      const re = buildSubstringRegex(["a|b", "(c)"]);
      expect(re.test("a|b and (c)")).toBe(true);
      expect(re.test("ab and c")).toBe(false);
    });
    test("handles undefined inputs safely", () => {
      const re1 = buildSubstringRegex();
      expect(re1.test("anything")).toBe(true);
      const re2 = buildSubstringRegex(["Eagle"], undefined);
      expect(re2.test("anything")).toBe(false);
      const re3 = buildSubstringRegex(undefined, "hello");
      expect(re3.test("anything")).toBe(false);
    });
  });

  describe("STOP_WORDS", () => {
    test("contains expected lowercase items and no empty strings", () => {
      expect(STOP_WORDS.has("the")).toBe(true);
      expect(STOP_WORDS.has("The")).toBe(false); // set is normalized to lowercase
      expect(STOP_WORDS.has("")).toBe(false);
    });

    test("works in combination to filter tokens", () => {
      const tokens = splitTokensForStopwords("the quick brown fox");
      const filtered = tokens.filter((t) => !STOP_WORDS.has(t.toLowerCase()));
      expect(filtered).toEqual(["quick", "brown", "fox"]);
    });
  });
});
