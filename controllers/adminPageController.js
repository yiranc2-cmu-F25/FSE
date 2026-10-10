import User from "../entities/User.js";
import { USER_ROLE } from "../constants/userRole.js";
import { toPlainObject } from "../utils/toPlainObject.js";
import {
  mapRoleToPrivilege,
  mapStatusToDisplay,
} from "../utils/admin/userDisplayMappers.js";

const NOT_FOUND_VIEW = "errorPages/404-pageNotFound";
const LIST_VIEW = "adminUserProfile/pages/member-list";
const EDIT_VIEW = "adminUserProfile/pages/edit-profile";
const LIST_TITLE = "Administer User Profile";
const EDIT_TITLE = "Edit User Profile";

/**
 * Page guard for the admin pages. The role is re-read from the database on
 * every request (not taken from the JWT) because an admin can change it at
 * any time. On success the plain user object is exposed as `req.currentUser`.
 */
export async function requireAdminPage(req, res, next) {
  try {
    const currentUser = toPlainObject(await User.findById(req.userId));
    if (!currentUser) return res.status(401).redirect("/");
    if (currentUser.role !== USER_ROLE.ADMIN) {
      return res.status(403).render(NOT_FOUND_VIEW);
    }
    req.currentUser = currentUser;
    next();
  } catch (err) {
    next(err);
  }
}

function toMemberListItem(user) {
  const u = toPlainObject(user);
  return {
    id: String(u._id || u.id),
    username: u.username,
    status: mapStatusToDisplay(u.status),
    privilege: mapRoleToPrivilege(u.role),
  };
}

function toEditableProfile(user) {
  const u = toPlainObject(user);
  return {
    id: String(u._id || u.id),
    username: u.username,
    passwordHash: "********", // never expose the real hash
    privilege: mapRoleToPrivilege(u.role),
    status: mapStatusToDisplay(u.status),
  };
}

/** Values every admin page needs about the viewer (nav bar + websocket auth). */
function viewerContext(req) {
  return {
    privilege: req.currentUser.role,
    username: req.currentUser.username,
  };
}

/** GET /admin/users */
export async function renderUserList(req, res) {
  try {
    const activeUsers = await User.getAllUsers();
    const inactiveUsers = await User.getInactiveUsers();
    const members = [...activeUsers, ...inactiveUsers].map(toMemberListItem);
    res.render(LIST_VIEW, {
      members,
      pageTitle: LIST_TITLE,
      ...viewerContext(req),
    });
  } catch (err) {
    console.error("Error fetching users for admin page:", err);
    res.render(LIST_VIEW, {
      members: [],
      pageTitle: LIST_TITLE,
      ...viewerContext(req),
    });
  }
}

/** GET /admin/users/:id/edit */
export async function renderUserEdit(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).render(NOT_FOUND_VIEW);
    res.render(EDIT_VIEW, {
      user: toEditableProfile(user),
      pageTitle: EDIT_TITLE,
      ...viewerContext(req),
    });
  } catch (err) {
    console.error("Error fetching user for edit page:", err);
    res.status(500).render(NOT_FOUND_VIEW);
  }
}
