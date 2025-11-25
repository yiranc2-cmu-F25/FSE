import {
  parseArrayField,
  parseNumberField,
  parseEmergencyContacts,
  parseHeight,
  parseWeight,
  arrayToString,
} from "../public/js/utils/emergencyProfile/dataParser.js";
import { convertBloodType, reverseConvertBloodType } from "../public/js/utils/emergencyProfile/bloodTypeConverter.js";
import { getVisibilitySetting, isVisibilityOkOrHelp } from "../public/js/utils/emergencyProfile/visibilityUtils.js";

describe("Data Parser - parseArrayField", () => {
  test("should return empty array for empty string", () => {
    expect(parseArrayField("")).toEqual([]);
    expect(parseArrayField("   ")).toEqual([]);
  });

  test("should split comma-separated values", () => {
    expect(parseArrayField("a,b,c")).toEqual(["a", "b", "c"]);
    expect(parseArrayField("peanuts, shellfish, dairy")).toEqual(["peanuts", "shellfish", "dairy"]);
  });

  test("should trim whitespace from values", () => {
    expect(parseArrayField("a, b , c")).toEqual(["a", "b", "c"]);
    expect(parseArrayField("  peanuts  ,  shellfish  ")).toEqual(["peanuts", "shellfish"]);
  });

  test("should filter out empty entries", () => {
    expect(parseArrayField("a,,b")).toEqual(["a", "b"]);
    expect(parseArrayField("a, ,b")).toEqual(["a", "b"]);
  });
});

describe("Data Parser - parseNumberField", () => {
  test("should return null for empty string", () => {
    expect(parseNumberField("")).toBeNull();
    expect(parseNumberField("   ")).toBeNull();
  });

  test("should parse valid numbers", () => {
    expect(parseNumberField("123")).toBe(123);
    expect(parseNumberField("175.5")).toBe(175.5);
    expect(parseNumberField("0")).toBe(0);
    expect(parseNumberField("-10")).toBe(-10);
  });

  test("should return null for invalid numbers", () => {
    expect(parseNumberField("abc")).toBeNull();
    expect(parseNumberField("not a number")).toBeNull();
  });

  test("should parse leading numbers from mixed strings", () => {
    // parseFloat parses leading numbers, so "123abc" becomes 123
    expect(parseNumberField("123abc")).toBe(123);
    expect(parseNumberField("45.5xyz")).toBe(45.5);
  });
});

describe("Data Parser - parseHeight", () => {
  test("should return null for empty string", () => {
    expect(parseHeight("")).toBeNull();
    expect(parseHeight("   ")).toBeNull();
  });

  test("should parse valid height values", () => {
    expect(parseHeight("170")).toBe(170);
    expect(parseHeight("175.5")).toBe(175.5);
    expect(parseHeight("50")).toBe(50);
    expect(parseHeight("300")).toBe(300);
  });

  test("should throw error for height below 50 cm", () => {
    expect(() => parseHeight("49")).toThrow("Height must be between 50 and 300 cm");
    expect(() => parseHeight("0")).toThrow("Height must be between 50 and 300 cm");
    expect(() => parseHeight("-10")).toThrow("Height must be between 50 and 300 cm");
  });

  test("should throw error for height above 300 cm", () => {
    expect(() => parseHeight("301")).toThrow("Height must be between 50 and 300 cm");
    expect(() => parseHeight("500")).toThrow("Height must be between 50 and 300 cm");
  });

  test("should throw error for invalid number", () => {
    expect(() => parseHeight("abc")).toThrow("Height must be a valid number");
    expect(() => parseHeight("not a number")).toThrow("Height must be a valid number");
  });

  test("should accept boundary values", () => {
    expect(parseHeight("50")).toBe(50);
    expect(parseHeight("300")).toBe(300);
  });
});

describe("Data Parser - parseWeight", () => {
  test("should return null for empty string", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("   ")).toBeNull();
  });

  test("should parse valid weight values", () => {
    expect(parseWeight("70")).toBe(70);
    expect(parseWeight("75.5")).toBe(75.5);
    expect(parseWeight("10")).toBe(10);
    expect(parseWeight("500")).toBe(500);
  });

  test("should throw error for weight below 10 kg", () => {
    expect(() => parseWeight("9")).toThrow("Weight must be between 10 and 500 kg");
    expect(() => parseWeight("0")).toThrow("Weight must be between 10 and 500 kg");
    expect(() => parseWeight("-5")).toThrow("Weight must be between 10 and 500 kg");
  });

  test("should throw error for weight above 500 kg", () => {
    expect(() => parseWeight("501")).toThrow("Weight must be between 10 and 500 kg");
    expect(() => parseWeight("1000")).toThrow("Weight must be between 10 and 500 kg");
  });

  test("should throw error for invalid number", () => {
    expect(() => parseWeight("abc")).toThrow("Weight must be a valid number");
    expect(() => parseWeight("not a number")).toThrow("Weight must be a valid number");
  });

  test("should accept boundary values", () => {
    expect(parseWeight("10")).toBe(10);
    expect(parseWeight("500")).toBe(500);
  });
});

describe("Data Parser - parseEmergencyContacts", () => {
  test("should return empty array for empty string", () => {
    expect(parseEmergencyContacts("")).toEqual([]);
    expect(parseEmergencyContacts("   ")).toEqual([]);
  });

  test("should parse valid contact numbers", () => {
    expect(parseEmergencyContacts("1234567890")).toEqual(["1234567890"]);
    expect(parseEmergencyContacts("123,456,789")).toEqual(["123", "456", "789"]);
    expect(parseEmergencyContacts("123, 456, 789")).toEqual(["123", "456", "789"]);
  });

  test("should throw error for non-numeric contacts", () => {
    expect(() => parseEmergencyContacts("abc")).toThrow("Emergency contacts must be numbers only");
    expect(() => parseEmergencyContacts("123,abc")).toThrow("Emergency contacts must be numbers only");
    expect(() => parseEmergencyContacts("123,456,abc,789")).toThrow("Emergency contacts must be numbers only");
  });

  test("should filter out empty entries", () => {
    expect(parseEmergencyContacts("123,,456")).toEqual(["123", "456"]);
    expect(parseEmergencyContacts("123, ,456")).toEqual(["123", "456"]);
  });

  test("should handle single contact", () => {
    expect(parseEmergencyContacts("1234567890")).toEqual(["1234567890"]);
  });

  test("should handle multiple contacts with spaces", () => {
    expect(parseEmergencyContacts("123, 456, 789")).toEqual(["123", "456", "789"]);
    expect(parseEmergencyContacts("  123  ,  456  ,  789  ")).toEqual(["123", "456", "789"]);
  });
});

describe("Data Parser - arrayToString", () => {
  test("should return empty string for empty array", () => {
    expect(arrayToString([])).toBe("");
    expect(arrayToString(null)).toBe("");
    expect(arrayToString(undefined)).toBe("");
  });

  test("should join array elements with comma and space", () => {
    expect(arrayToString(["a", "b", "c"])).toBe("a, b, c");
    expect(arrayToString(["peanuts", "shellfish"])).toBe("peanuts, shellfish");
  });

  test("should handle single element array", () => {
    expect(arrayToString(["single"])).toBe("single");
  });
});

describe("Blood Type Converter - convertBloodType", () => {
  test("should convert blood type formats correctly", () => {
    expect(convertBloodType("A+")).toBe("A_POS");
    expect(convertBloodType("A-")).toBe("A_NEG");
    expect(convertBloodType("B+")).toBe("B_POS");
    expect(convertBloodType("B-")).toBe("B_NEG");
    expect(convertBloodType("AB+")).toBe("AB_POS");
    expect(convertBloodType("AB-")).toBe("AB_NEG");
    expect(convertBloodType("O+")).toBe("O_POS");
    expect(convertBloodType("O-")).toBe("O_NEG");
  });

  test("should return null for invalid or unknown blood types", () => {
    expect(convertBloodType("unknown")).toBeNull();
    expect(convertBloodType("Unknown")).toBeNull();
    expect(convertBloodType("")).toBeNull();
    expect(convertBloodType(null)).toBeNull();
    expect(convertBloodType("invalid")).toBeNull();
  });
});

describe("Blood Type Converter - reverseConvertBloodType", () => {
  test("should convert from constant format to display format", () => {
    expect(reverseConvertBloodType("A_POS")).toBe("A+");
    expect(reverseConvertBloodType("A_NEG")).toBe("A-");
    expect(reverseConvertBloodType("B_POS")).toBe("B+");
    expect(reverseConvertBloodType("B_NEG")).toBe("B-");
    expect(reverseConvertBloodType("AB_POS")).toBe("AB+");
    expect(reverseConvertBloodType("AB_NEG")).toBe("AB-");
    expect(reverseConvertBloodType("O_POS")).toBe("O+");
    expect(reverseConvertBloodType("O_NEG")).toBe("O-");
  });

  test("should return display format as is if already in correct format", () => {
    expect(reverseConvertBloodType("A+")).toBe("A+");
    expect(reverseConvertBloodType("A-")).toBe("A-");
    expect(reverseConvertBloodType("B+")).toBe("B+");
  });

  test("should return empty string for invalid or null values", () => {
    expect(reverseConvertBloodType(null)).toBe("");
    expect(reverseConvertBloodType(undefined)).toBe("");
    expect(reverseConvertBloodType("invalid")).toBe("");
  });
});

describe("Visibility Utils - getVisibilitySetting", () => {
  test("should return helpOrOk when checked is true", () => {
    expect(getVisibilitySetting(true)).toBe("helpOrOk");
  });

  test("should return emergencyOnly when checked is false", () => {
    expect(getVisibilitySetting(false)).toBe("emergencyOnly");
  });
});

describe("Visibility Utils - isVisibilityOkOrHelp", () => {
  test("should return true for helpOrOk", () => {
    expect(isVisibilityOkOrHelp("helpOrOk")).toBe(true);
  });

  test("should return true for okOrHelp", () => {
    expect(isVisibilityOkOrHelp("okOrHelp")).toBe(true);
  });

  test("should return true for OK_OR_HELP", () => {
    expect(isVisibilityOkOrHelp("OK_OR_HELP")).toBe(true);
  });

  test("should return false for emergencyOnly", () => {
    expect(isVisibilityOkOrHelp("emergencyOnly")).toBe(false);
  });

  test("should return false for invalid values", () => {
    expect(isVisibilityOkOrHelp(null)).toBe(false);
    expect(isVisibilityOkOrHelp(undefined)).toBe(false);
    expect(isVisibilityOkOrHelp("invalid")).toBe(false);
  });
});

describe("Data Parser - Integration Tests", () => {
  test("should handle complete profile data parsing", () => {
    const height = parseHeight("175");
    const weight = parseWeight("70");
    const allergies = parseArrayField("peanuts, shellfish");
    const contacts = parseEmergencyContacts("123, 456");

    expect(height).toBe(175);
    expect(weight).toBe(70);
    expect(allergies).toEqual(["peanuts", "shellfish"]);
    expect(contacts).toEqual(["123", "456"]);
  });

  test("should handle validation errors in sequence", () => {
    expect(() => parseHeight("500")).toThrow();
    expect(() => parseWeight("600")).toThrow();
    expect(() => parseEmergencyContacts("abc")).toThrow();
  });
});
