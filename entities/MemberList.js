import User from "./User.js";

export async function getOnlineOfflineMembers(app) {
  const docs = await fetchAllUsers();
  const members = mapMembers(docs);
  const onlineSet = buildOnlineMemberSet(app);
  const partitions = partitionMembersByStatus(members, onlineSet);
  sortPartitionByName(partitions);
  return partitions;
}

async function fetchAllUsers() {
  return User.getAllUsers();
}

function mapMembers(docs) {
  return (docs || [])
    .map((d) => ({
      id: String(d?._id ?? d?.id ?? d?.userId),
      name: d?.username,
      status: d?.sharedstatus ?? "UNDEFINED",
    }))
    .filter((u) => !!u.id);
}

function buildOnlineMemberSet(app) {
  const onlineNames = app.get("socketInstance")?.getOnline?.() ?? [];
  return new Set(onlineNames.map((n) => (n || "").toLowerCase()));
}

function partitionMembersByStatus(members, onlineSet) {
  const buckets = { onlineUsers: [], offlineUsers: [] };
  for (const member of members) {
    const target =
      onlineSet.has((member?.name || "").toLowerCase()) ? "onlineUsers" : "offlineUsers";
    buckets[target].push(member);
  }
  return buckets;
}

function sortPartitionByName(partitions) {
  const byName = (a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name));
  partitions.onlineUsers.sort(byName);
  partitions.offlineUsers.sort(byName);
}

function normalizeName(name) {
  return (name || "").toLowerCase();
}
