import { iStatusDao } from "./iStatusDao";

export class inMemoryStatusDao extends iStatusDao {
    constructor() {
        super();
        this.statusChanges = [];
    }

    async recordChange({ userId, newStatus, at = new Date() }) {
        const entry = {
            id: String(this.statusChanges.length + 1),
            user: userId,
            status: newStatus,
            timestamp: at,
        };
        this.statusChanges.push(entry);
        return entry;
    }

    async getHistory({ userId, limit = 10, cursor }) {
        let filtered = this.statusChanges.filter(sc => sc.user === userId);
        filtered.sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id));

        if (cursor) {
            const [cursorTs, cursorId] = cursor.split("|");
            const cursorDate = new Date(cursorTs);
            filtered = filtered.filter(sc => 
                sc.timestamp < cursorDate || 
                (sc.timestamp.getTime() === cursorDate.getTime() && sc.id < cursorId)
            );
        }

        const safeLimit = Math.min(Math.max(1, +limit || 10), 100);
        const itemsPlusOne = filtered.slice(0, safeLimit + 1);

        const hasMore = itemsPlusOne.length > safeLimit;
        const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;

        const last = pageItems[pageItems.length - 1];
        const nextCursor = hasMore
            ? `${new Date(last.timestamp).toISOString()}|${String(last.id)}`
            : null;

        const total = filtered.length;

        return { total, items: pageItems, nextCursor };
    }
}