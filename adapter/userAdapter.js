import User from "../models/User.js";

export async function findByUsername(username) {
    return User.findByUsername(username);
}

export async function getUsernameAndStatus() {
    return User.find({}, { username: 1, sharedstatus: 1 }).lean();
}

export async function getUsernameById(userId) {
    return User.getUsernameById(userId);
}
