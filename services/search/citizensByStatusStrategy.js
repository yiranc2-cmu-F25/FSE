import { getOnlineOfflineMembers } from "../../entities/MemberList.js";

export const citizensByStatusStrategy = {
  async execute({ req }) {
    try {
        const raw = String(req.query.status ?? req.params.status ?? '').trim();
        if (!raw) return { error: 'Missing param: status' };

        const limit = Math.min(Number(req.query.limit ?? 50), 200);
        const offset = Math.max(Number(req.query.offset ?? 0), 0);
        const needle = raw.toLowerCase();

        const { onlineUsers, offlineUsers } = await getOnlineOfflineMembers(req.app);

        const matches = (u) => String(u.status ?? '').toLowerCase() === needle;
        const on = onlineUsers.filter(matches);
        const off = offlineUsers.filter(matches);

        const toItem = (u, availability) => ({
        u: { id: u.id, name: u.name, status: u.status ?? null },
        availability, // 'online' | 'offline'
        });
        const merged = [...on.map(u => toItem(u, 'online')), ...off.map(u => toItem(u, 'offline'))];

        const count = merged.length;
        const results = merged.slice(offset, offset + limit);

        return { count, results };
    } catch (err) {
        return { status: 'error', message: 'Server error' };
    }
  }
};