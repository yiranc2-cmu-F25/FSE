import { iAnnouncementDao } from "./iAnnouncementDao.js";

export class inMemoryAnnouncementDao extends iAnnouncementDao {
  constructor() {
    super();
    this.announcements = [];
    this.idCounter = 0;
  }

  async create({ sender, status, content, timestamp }) {
    const newAnnouncement = {
      sender,
      status,
      content,
      timestamp: timestamp || new Date(),
      id: ++this.idCounter,
    };
    this.announcements.push(newAnnouncement);
    return newAnnouncement;
  }

  async getAnnouncement() {
    // Import UserDac here to avoid circular dependency
    const UserDac = (await import("../dacs/userDac.js")).default;
    
    const sortedAnnouncements = [...this.announcements].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Populate sender with username to match real DAO behavior
    const populatedAnnouncements = await Promise.all(
      sortedAnnouncements.map(async (announcement) => {
        let senderUsername = null;
        try {
          // Try to get username from UserDac if available
          const user = await UserDac.DAO?.findById?.(announcement.sender);
          senderUsername = user?.username || null;
        } catch (e) {
          // If UserDac is not available or findById doesn't exist, keep sender as is
          console.log("[inMemoryAnnouncementDao] Could not populate sender:", e.message);
        }
        
        return {
          ...announcement,
          sender: senderUsername ? { username: senderUsername } : announcement.sender,
        };
      })
    );
    
    return populatedAnnouncements;
  }

  async searchAnnouncement({ terms = [], phrase = "", limit = 10, cursor } = {}) {
    // Import search utilities
    const { buildSubstringRegex } = await import("../utils/search/search.js");
    const { parseCursor, buildCursorClause } = await import("../utils/search/cursor.js");
    
    // Build regex for content search
    const regex = buildSubstringRegex(terms, phrase);
    
    // Filter announcements by content
    let filtered = this.announcements.filter(announcement => {
      return regex.test(announcement.content);
    });
    
    // Apply cursor if provided
    const parsed = parseCursor(cursor);
    if (parsed) {
      filtered = filtered.filter(announcement => {
        const annTs = new Date(announcement.timestamp);
        const cursorTs = parsed.ts;
        
        // Apply cursor logic: timestamp < cursorTs OR (timestamp === cursorTs AND id < cursorId)
        if (annTs < cursorTs) return true;
        if (annTs.getTime() === cursorTs.getTime()) {
          const annId = String(announcement.id || announcement._id);
          return annId < parsed.idStr;
        }
        return false;
      });
    }
    
    // Sort by timestamp descending, then by id descending
    filtered.sort((a, b) => {
      const tsA = new Date(a.timestamp).getTime();
      const tsB = new Date(b.timestamp).getTime();
      if (tsB !== tsA) return tsB - tsA; // Descending timestamp
      const idA = String(a.id || a._id);
      const idB = String(b.id || b._id);
      return idB.localeCompare(idA); // Descending id
    });
    
    // Apply limit (take one extra to check if there's more)
    const safeLimit = Math.min(Math.max(1, +limit || 10), 100);
    const itemsPlusOne = filtered.slice(0, safeLimit + 1);
    
    const hasMore = itemsPlusOne.length > safeLimit;
    const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;
    
    // Build nextCursor if there's more
    let nextCursor = null;
    if (hasMore && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      const lastTs = new Date(last.timestamp).toISOString();
      const lastId = String(last.id || last._id);
      nextCursor = `${lastTs}|${lastId}`;
    }
    
    // Count total matching items
    const count = filtered.length;
    
    // Populate sender with username
    const UserDac = (await import("../dacs/userDac.js")).default;
    const populatedItems = await Promise.all(
      pageItems.map(async (item) => {
        let senderUsername = null;
        try {
          const user = await UserDac.DAO?.findById?.(item.sender);
          senderUsername = user?.username || null;
        } catch (e) {
          console.log("[inMemoryAnnouncementDao] Could not populate sender:", e.message);
        }
        
        return {
          ...item,
          _id: item.id || item._id,
          sender: senderUsername ? { username: senderUsername } : item.sender,
        };
      })
    );
    
    return { code: 200, count, items: populatedItems, nextCursor };
  }
}

