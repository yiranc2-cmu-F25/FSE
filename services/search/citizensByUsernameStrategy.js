import { getOnlineOfflineMembers } from "../../entities/MemberList.js";
import { SearchStrategy } from "./SearchStrategy.js";

export class CitizensByUsernameStrategy extends SearchStrategy {
  async execute({ req }) {
    try {
        const q = (req.query.username ?? '').trim();
        if (!q) return { code: 400, error: 'Missing query param: username' };

        const limit = Math.min(Number(req.query.limit ?? 50), 200);
        const offset = Math.max(Number(req.query.offset ?? 0), 0);
        const needle = q.toLowerCase();

        const { onlineUsers, offlineUsers } = await getOnlineOfflineMembers(req.app);

        const match = u => (u.name || '').toLowerCase().includes(needle);
        const on = onlineUsers.filter(match);
        const off = offlineUsers.filter(match);

        const merged = [
            ...on.map(u => ({ u, availability: 'online' })),
            ...off.map(u => ({ u, availability: 'offline' })),
        ];

        const count = merged.length;
        const results = req.query.limit ? 
            merged.slice(offset, offset + limit) :
            merged.slice(offset);

        return { code: 200, count, results };
    } catch (err) {
        return { code: 500, status: "error", message: "Server error" };
    }
  }
}

export const citizensByUsernameStrategy = new CitizensByUsernameStrategy();