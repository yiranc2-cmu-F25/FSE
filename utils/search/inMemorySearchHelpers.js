import { parseCursor } from "./cursor.js";

export function applyCursorFilter(filtered, cursor) {
  const parsed = parseCursor(cursor);
  if (!parsed) return filtered;
  
  return filtered.filter(item => {
    const itemTs = new Date(item.timestamp);
    const cursorTs = parsed.ts;
    
    if (itemTs < cursorTs) return true;
    if (itemTs.getTime() === cursorTs.getTime()) {
      const itemId = String(item.id || item._id);
      return itemId < parsed.idStr;
    }
    return false;
  });
}

export function sortByTimestampDesc(items) {
  return items.sort((a, b) => {
    const tsA = new Date(a.timestamp).getTime();
    const tsB = new Date(b.timestamp).getTime();
    if (tsB !== tsA) return tsB - tsA; 
    const idA = String(a.id || a._id);
    const idB = String(b.id || b._id);
    return idB.localeCompare(idA); 
  });
}

export function applyPagination(filtered, limit = 10) {
  const safeLimit = Math.min(Math.max(1, +limit || 10), 100);
  const itemsPlusOne = filtered.slice(0, safeLimit + 1);
  
  const hasMore = itemsPlusOne.length > safeLimit;
  const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;
  
  let nextCursor = null;
  if (hasMore && pageItems.length > 0) {
    const last = pageItems[pageItems.length - 1];
    const lastTs = new Date(last.timestamp).toISOString();
    const lastId = String(last.id || last._id);
    nextCursor = `${lastTs}|${lastId}`;
  }
  
  const count = filtered.length;
  
  return { pageItems, nextCursor, count };
}

export async function populateSender(items, logPrefix = "[inMemoryDao]") {
  const UserDac = (await import("../../dacs/userDac.js")).default;
  
  return await Promise.all(
    items.map(async (item) => {
      let senderUsername = null;
      try {
        const user = await UserDac.DAO?.findById?.(item.sender);
        senderUsername = user?.username || null;
      } catch (e) {
        console.log(`${logPrefix} Could not populate sender:`, e.message);
      }
      
      return {
        ...item,
        _id: item.id || item._id,
        sender: senderUsername ? { username: senderUsername } : item.sender,
      };
    })
  );
}

