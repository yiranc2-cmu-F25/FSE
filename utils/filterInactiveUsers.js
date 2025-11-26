import { USER_STATUS } from "../constants/userStatus.js";
import User from "../entities/User.js";

export function isUserActive(user) {
    if (!user) return false;

    if (typeof user === 'string' || (user._id && !user.status)) {
        return true;
    }
    
    if (user.status !== undefined) {
        return user.status === USER_STATUS.ACTIVE;
    }
    
    return true;
}

export async function getActiveUserIds(userIds) {
    if (!userIds || userIds.length === 0) return new Set();
    
    const activeUserIds = new Set();
    const uniqueIds = [...new Set(userIds.map(id => String(id)))];
    
    const checks = await Promise.all(
        uniqueIds.map(async (id) => {
            try {
                const user = await User.findById(id);
                if (user && user.status === USER_STATUS.ACTIVE) {
                    return id;
                }
            } catch (err) {
            }
            return null;
        })
    );
    
    checks.forEach(id => {
        if (id) activeUserIds.add(id);
    });
    
    return activeUserIds;
}


export function filterInactiveUsers(items, userField) {
    if (!Array.isArray(items)) return items;
    
    const fields = Array.isArray(userField) ? userField : [userField];
    
    return items.filter(item => {
        for (const field of fields) {
            const user = item[field];
            if (user && !isUserActive(user)) {
                return false; 
            }
        }
        return true;
    });
}


export function filterItemIfInactive(item, userField) {
    if (!item) return null;
    
    const fields = Array.isArray(userField) ? userField : [userField];
    
    for (const field of fields) {
        const user = item[field];
        if (user && !isUserActive(user)) {
            return null; 
        }
    }
    
    return item;
}

