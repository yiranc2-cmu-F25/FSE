import { iAnnouncementDao } from "./iAnnouncementDao.js";
import { applyCursorFilter, sortByTimestampDesc, applyPagination, populateSender } from "../utils/search/inMemorySearchHelpers.js";

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
    const UserDac = (await import("../dacs/userDac.js")).default;
    
    const sortedAnnouncements = [...this.announcements].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const populatedAnnouncements = await Promise.all(
      sortedAnnouncements.map(async (announcement) => {
        let senderUsername = null;
        try {
          const user = await UserDac.DAO?.findById?.(announcement.sender);
          senderUsername = user?.username || null;
        } catch (e) {
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
    const { buildSubstringRegex } = await import("../utils/search/search.js");
    
    const regex = buildSubstringRegex(terms, phrase);
    
    let filtered = this.announcements.filter(announcement => {
      return regex.test(announcement.content);
    });
    
    filtered = applyCursorFilter(filtered, cursor);
    
    filtered = sortByTimestampDesc(filtered);
    
    const { pageItems, nextCursor, count } = applyPagination(filtered, limit);
    
    const populatedItems = await populateSender(pageItems, "[inMemoryAnnouncementDao]");
    
    return { code: 200, count, items: populatedItems, nextCursor };
  }
}

