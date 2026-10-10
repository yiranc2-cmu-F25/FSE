import {
  mapRoleToPrivilege,
  mapStatusToDisplay,
} from "../utils/admin/userDisplayMappers.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";

describe("userDisplayMappers", () => {
  test.each([
    [USER_ROLE.ADMIN, "Administrator"],
    [USER_ROLE.COORDINATOR, "Coordinator"],
    [USER_ROLE.CITIZEN, "Citizen"],
    [undefined, "Citizen"],
    ["not-a-role", "Citizen"],
  ])("mapRoleToPrivilege(%p) -> %s", (role, expected) => {
    expect(mapRoleToPrivilege(role)).toBe(expected);
  });

  test.each([
    [USER_STATUS.ACTIVE, "Active"],
    [USER_STATUS.INACTIVE, "Inactive"],
    [undefined, "Inactive"],
    ["not-a-status", "Inactive"],
  ])("mapStatusToDisplay(%p) -> %s", (status, expected) => {
    expect(mapStatusToDisplay(status)).toBe(expected);
  });
});
