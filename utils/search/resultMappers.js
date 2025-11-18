export function mapSearchResults(items, currentUsername = "", includeIsOwn = false) {
  const me = currentUsername.toLowerCase();
  
  return items.map(m => {
    const result = {
      id: String(m._id),
      sender: m.sender?.username ?? m.sender ?? null,
      content: m.content,
      timestamp: m.timestamp,
      status: m.status,
    };
    
    if (includeIsOwn) {
      result.isOwn = ((m.sender?.username ?? m.sender ?? "").toLowerCase() === me);
    }
    
    return result;
  });
}

