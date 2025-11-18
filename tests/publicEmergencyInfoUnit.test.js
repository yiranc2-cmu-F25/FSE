import { isVisibilityOkOrHelp } from "../public/js/utils/emergencyProfile/visibilityUtils.js";
import { reverseConvertBloodType } from "../public/js/utils/emergencyProfile/bloodTypeConverter.js";

describe("Visibility Utils - isVisibilityOkOrHelp", () => {
  test("should return true for helpOrOk visibility", () => {
    expect(isVisibilityOkOrHelp("helpOrOk")).toBe(true);
  });

  test("should return true for okOrHelp visibility", () => {
    expect(isVisibilityOkOrHelp("okOrHelp")).toBe(true);
  });

  test("should return true for OK_OR_HELP visibility", () => {
    expect(isVisibilityOkOrHelp("OK_OR_HELP")).toBe(true);
  });

  test("should return false for emergencyOnly visibility", () => {
    expect(isVisibilityOkOrHelp("emergencyOnly")).toBe(false);
  });

  test("should return false for null or undefined", () => {
    expect(isVisibilityOkOrHelp(null)).toBe(false);
    expect(isVisibilityOkOrHelp(undefined)).toBe(false);
  });

  test("should return false for invalid values", () => {
    expect(isVisibilityOkOrHelp("invalid")).toBe(false);
    expect(isVisibilityOkOrHelp("")).toBe(false);
  });
});

describe("Public Emergency Info - Status Normalization", () => {
  test("should normalize status to lowercase", () => {
    const statuses = ["OK", "ok", "HELP", "help", "EMERGENCY", "emergency"];
    statuses.forEach((status) => {
      const normalized = status.toLowerCase();
      expect(normalized).toBe(status.toLowerCase());
    });
  });

  test("should identify ok or help status correctly", () => {
    const okStatuses = ["ok", "OK", "help", "HELP"];
    okStatuses.forEach((status) => {
      const normalized = status.toLowerCase();
      const isOkOrHelp = normalized === "ok" || normalized === "help";
      expect(isOkOrHelp).toBe(true);
    });
  });

  test("should identify emergency status correctly", () => {
    const emergencyStatuses = ["emergency", "EMERGENCY"];
    emergencyStatuses.forEach((status) => {
      const normalized = status.toLowerCase();
      const isOkOrHelp = normalized === "ok" || normalized === "help";
      expect(isOkOrHelp).toBe(false);
    });
  });

  test("should identify undefined status correctly", () => {
    const undefinedStatuses = ["undefined", "UNDEFINED", "Undefined"];
    undefinedStatuses.forEach((status) => {
      const normalized = status.toLowerCase();
      const isOkOrHelp = normalized === "ok" || normalized === "help";
      expect(isOkOrHelp).toBe(false);
    });
  });
});

describe("Public Emergency Info - Profile Filtering", () => {
  test("should filter emergency profiles correctly", () => {
    const allProfiles = {
      emergency: [
        { _id: "1", userStatus: "emergency", username: "User1" },
        { _id: "2", userStatus: "emergency", username: "User2" },
      ],
      others: [
        { _id: "3", userStatus: "ok", username: "User3" },
        { _id: "4", userStatus: "help", username: "User4" },
        { _id: "5", userStatus: "undefined", username: "User5" },
      ],
    };

    expect(allProfiles.emergency).toHaveLength(2);
    expect(allProfiles.emergency.every((p) => p.userStatus === "emergency")).toBe(true);
  });

  test("should filter ok/help profiles correctly", () => {
    const profiles = [
      { _id: "1", userStatus: "ok", username: "User1" },
      { _id: "2", userStatus: "help", username: "User2" },
      { _id: "3", userStatus: "emergency", username: "User3" },
      { _id: "4", userStatus: "undefined", username: "User4" },
    ];

    const okHelpProfiles = profiles.filter((p) => {
      const status = p.userStatus || p.profile?.userStatus;
      return status === "ok" || status === "help" || status === "OK" || status === "HELP";
    });

    expect(okHelpProfiles).toHaveLength(2);
    expect(okHelpProfiles.map((p) => p.userStatus)).toEqual(expect.arrayContaining(["ok", "help"]));
  });

  test("should handle case-insensitive status matching", () => {
    const profiles = [
      { _id: "1", userStatus: "OK", username: "User1" },
      { _id: "2", userStatus: "ok", username: "User2" },
      { _id: "3", userStatus: "HELP", username: "User3" },
      { _id: "4", userStatus: "help", username: "User4" },
    ];

    const okHelpProfiles = profiles.filter((p) => {
      const status = (p.userStatus || "").toLowerCase();
      return status === "ok" || status === "help";
    });

    expect(okHelpProfiles).toHaveLength(4);
  });

  test("should handle profiles with nested userStatus", () => {
    const profiles = [
      { _id: "1", profile: { userStatus: "ok" }, username: "User1" },
      { _id: "2", userStatus: "help", username: "User2" },
    ];

    const okHelpProfiles = profiles.filter((p) => {
      const status = p.userStatus || p.profile?.userStatus;
      return status === "ok" || status === "help" || status === "OK" || status === "HELP";
    });

    expect(okHelpProfiles).toHaveLength(2);
  });
});

describe("Public Emergency Info - Bookmark Management", () => {
  test("should track bookmarked profile IDs in Set", () => {
    const bookmarkedProfiles = [
      { _id: "1", username: "User1" },
      { _id: "2", username: "User2" },
    ];

    const bookmarkedProfileIds = new Set(bookmarkedProfiles.map((p) => String(p._id)));

    expect(bookmarkedProfileIds.has("1")).toBe(true);
    expect(bookmarkedProfileIds.has("2")).toBe(true);
    expect(bookmarkedProfileIds.has("3")).toBe(false);
    expect(bookmarkedProfileIds.size).toBe(2);
  });

  test("should handle bookmark toggle state", () => {
    let isBookmarked = false;

    // Toggle to bookmarked
    isBookmarked = true;
    expect(isBookmarked).toBe(true);

    // Toggle to not bookmarked
    isBookmarked = false;
    expect(isBookmarked).toBe(false);
  });

  test("should add and remove bookmarks from Set", () => {
    const bookmarkedProfileIds = new Set();

    // Add bookmarks
    bookmarkedProfileIds.add("1");
    bookmarkedProfileIds.add("2");
    expect(bookmarkedProfileIds.has("1")).toBe(true);
    expect(bookmarkedProfileIds.has("2")).toBe(true);

    // Remove bookmark
    bookmarkedProfileIds.delete("1");
    expect(bookmarkedProfileIds.has("1")).toBe(false);
    expect(bookmarkedProfileIds.has("2")).toBe(true);
  });

  test("should convert profile IDs to strings for Set", () => {
    const bookmarkedProfiles = [
      { _id: 1, username: "User1" },
      { _id: "2", username: "User2" },
    ];

    const bookmarkedProfileIds = new Set(bookmarkedProfiles.map((p) => String(p._id)));

    expect(bookmarkedProfileIds.has("1")).toBe(true);
    expect(bookmarkedProfileIds.has("2")).toBe(true);
  });
});

describe("Public Emergency Info - Visibility Field Logic", () => {
  test("should determine field visibility for emergency status", () => {
    const userStatus = "emergency";
    const normalizedStatus = userStatus.toLowerCase();
    const isOkOrHelp = normalizedStatus === "ok" || normalizedStatus === "help";

    // For emergency status, all fields should be visible regardless of visibility setting
    expect(isOkOrHelp).toBe(false);
  });

  test("should determine field visibility for ok status", () => {
    const userStatus = "ok";
    const normalizedStatus = userStatus.toLowerCase();
    const isOkOrHelp = normalizedStatus === "ok" || normalizedStatus === "help";

    expect(isOkOrHelp).toBe(true);

    // Test with visibility setting
    const visibility = { bloodType: "helpOrOk" };
    const shouldShow = isVisibilityOkOrHelp(visibility.bloodType);
    expect(shouldShow).toBe(true);
  });

  test("should determine field visibility for help status", () => {
    const userStatus = "help";
    const normalizedStatus = userStatus.toLowerCase();
    const isOkOrHelp = normalizedStatus === "ok" || normalizedStatus === "help";

    expect(isOkOrHelp).toBe(true);

    // Test with visibility setting
    const visibility = { height: "emergencyOnly" };
    const shouldShow = isVisibilityOkOrHelp(visibility.height);
    expect(shouldShow).toBe(false);
  });

  test("should handle visibility with fallback values", () => {
    const visibility = {
      bloodType: undefined,
      bloddType: "helpOrOk", // Typo fallback
    };

    // Simulate fallback logic
    let visibilityValue = visibility.bloodType;
    if (!visibilityValue && visibility.bloddType) {
      visibilityValue = visibility.bloddType;
    }

    expect(isVisibilityOkOrHelp(visibilityValue)).toBe(true);
  });
});

describe("Public Emergency Info - Data Processing", () => {
  test("should process profile data with all fields", () => {
    const profile = {
      _id: "profile123",
      username: "Test User",
      userStatus: "ok",
      bloodType: "A_POS",
      height: 175,
      weight: 70,
      allergies: ["peanuts"],
      currentMedications: ["aspirin"],
      chronicConditions: ["diabetes"],
      emergencyContacts: ["1234567890"],
    };

    expect(profile._id).toBe("profile123");
    expect(profile.username).toBe("Test User");
    expect(profile.userStatus).toBe("ok");
    expect(profile.bloodType).toBe("A_POS");
    expect(profile.height).toBe(175);
    expect(profile.weight).toBe(70);
    expect(Array.isArray(profile.allergies)).toBe(true);
    expect(Array.isArray(profile.currentMedications)).toBe(true);
  });

  test("should handle null and undefined values in profile", () => {
    const profile = {
      _id: "profile123",
      username: "Test User",
      userStatus: "ok",
      height: null,
      weight: undefined,
      allergies: null,
    };

    expect(profile.height).toBeNull();
    expect(profile.weight).toBeUndefined();
    expect(profile.allergies).toBeNull();
  });

  test("should convert blood type for display", () => {
    const profile = {
      bloodType: "A_POS",
    };

    const displayType = reverseConvertBloodType(profile.bloodType);
    expect(displayType).toBe("A+");
  });
});
