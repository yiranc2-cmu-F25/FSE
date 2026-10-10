import { USER_ROLE } from "../../constants/userRole.js";
import { USER_STATUS } from "../../constants/userStatus.js";

const ROLE_LABELS = Object.freeze({
  [USER_ROLE.ADMIN]: "Administrator",
  [USER_ROLE.COORDINATOR]: "Coordinator",
  [USER_ROLE.CITIZEN]: "Citizen",
});

const STATUS_LABELS = Object.freeze({
  [USER_STATUS.ACTIVE]: "Active",
  [USER_STATUS.INACTIVE]: "Inactive",
});

/** Backend role ("admin") -> label shown on admin pages ("Administrator"). */
export function mapRoleToPrivilege(role) {
  return ROLE_LABELS[role] ?? ROLE_LABELS[USER_ROLE.CITIZEN];
}

/** Backend account status ("active") -> label shown on admin pages ("Active"). */
export function mapStatusToDisplay(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS[USER_STATUS.INACTIVE];
}
