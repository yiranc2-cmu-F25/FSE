import User from "./User.js";

export async function getOnlineOfflineMembers(app) {
  // Fetch user basics from DB
  const docs = await User.getAllUsers();
  //console.log("[lists] raw first doc keys:", docs?.[0] && Object.keys(docs[0]));
  // const docs = await app.locals.userDao.getAllUsers();

  const all = docs
    .map(d => ({
      id: String(d._id ?? d.id ?? d.userId),
      name: d.username,
      status: d.sharedstatus ?? "UNDEFINED",
    }))
    .filter(u => !!u.id);

  // Get currently online usernames from socketInstance
  const onlineNames = app.get("socketInstance")?.getOnline?.() ?? [];
  const onlineSet = new Set(onlineNames.map(n => (n || "").toLowerCase()));

  // Partition into online/offline arrays
  const onlineUsers = [];
  const offlineUsers = [];
  for (const u of all) {
    (onlineSet.has((u.name || "").toLowerCase())
      ? onlineUsers
      : offlineUsers
    ).push(u);
  }

  // Sort by name
  const byName = (a, b) =>
    (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
  onlineUsers.sort(byName);
  offlineUsers.sort(byName);

  return { onlineUsers, offlineUsers };
}
