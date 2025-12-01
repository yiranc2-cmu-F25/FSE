import { iEmergencyProfileDao } from "./iEmergencyProfileDao.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { getActiveUserIds } from "../utils/filterInactiveUsers.js";

export class inMemoryEmergencyProfileDao extends iEmergencyProfileDao {
    constructor() {
        super();
        this.profiles = [];
        this.bookmarks = [];
        this.photos = [];
    }

    async getAllEmergencyProfiles() {
        // Return all profiles with facePhotoId populated, filtered by active users
        const profilesWithPhotos = this.profiles.map(profile => {
            const photo = this.photos?.find(p => p.profileId === String(profile._id || profile.id));
            return {
                ...profile,
                facePhotoId: photo ? { _id: photo._id, profileId: photo.profileId } : null,
            };
        });
        
        // Filter out profiles where user is inactive
        if (profilesWithPhotos.length === 0) return [];
        
        const userIds = profilesWithPhotos.map(p => p.userId).filter(Boolean);
        const activeUserIds = await getActiveUserIds(userIds);
        
        return profilesWithPhotos.filter(p => p.userId && activeUserIds.has(String(p.userId)));
    }

    async getBookmarkedEmergencyProfiles(userId) {
        const userBookmarks = this.bookmarks.filter(b => String(b.ownId) === String(userId));
        if (userBookmarks.length === 0) return [];
        
        const profileIds = userBookmarks.map(b => b.profileId);
        const profiles = this.profiles.filter(p => {
            const profileId = String(p._id || p.id);
            return profileIds.includes(profileId);
        });
        
        const profilesWithPhotos = profiles.map(profile => {
            const photo = this.photos?.find(p => p.profileId === String(profile._id || profile.id));
            return {
                ...profile,
                facePhotoId: photo ? { _id: photo._id, profileId: photo.profileId } : null,
            };
        });
        
        // Filter out profiles where user is inactive
        if (profilesWithPhotos.length === 0) return [];
        
        const profileUserIds = profilesWithPhotos.map(p => p.userId).filter(Boolean);
        const activeUserIds = await getActiveUserIds(profileUserIds);
        
        return profilesWithPhotos.filter(p => p.userId && activeUserIds.has(String(p.userId)));
    }

    async bookmarkEmergencyProfile(userId, profileId) {
        const existing = this.bookmarks.find(
            b => String(b.ownId) === String(userId) && String(b.profileId) === String(profileId)
        );
        if (!existing) {
            this.bookmarks.push({
                _id: this.bookmarks.length + 1,
                ownId: userId,
                profileId: profileId,
            });
        }
    }

    async unbookmarkEmergencyProfile(userId, profileId) {
        this.bookmarks = this.bookmarks.filter(
            b => !(String(b.ownId) === String(userId) && String(b.profileId) === String(profileId))
        );
    }

    async getPersonalEmergencyProfile(userId) {
        const profile = this.profiles.find(p => String(p.userId) === String(userId));
        if (!profile) return null;
        
        // Check if user is active
        const UserDac = (await import("../dacs/userDac.js")).default;
        const user = await UserDac.DAO?.findById?.(userId);
        if (!user || user.status !== USER_STATUS.ACTIVE) {
            return null;
        }
        
        const photo = this.photos?.find(p => p.profileId === String(profile._id || profile.id));
        return {
            ...profile,
            facePhotoId: photo ? { _id: photo._id, profileId: photo.profileId } : null,
        };
    }

    async updatePersonalEmergencyProfile(userId, profileData) {
        const existingIndex = this.profiles.findIndex(p => String(p.userId) === String(userId));
        const profileId = existingIndex >= 0 
            ? (this.profiles[existingIndex]._id || this.profiles[existingIndex].id)
            : this.profiles.length + 1;
        
        const updatedProfile = {
            _id: profileId,
            id: profileId,
            userId: userId,
            ...profileData,
        };
        
        if (existingIndex >= 0) {
            this.profiles[existingIndex] = updatedProfile;
        } else {
            this.profiles.push(updatedProfile);
        }
        
        return updatedProfile;
    }

    async deletePersonalEmergencyProfile(userId) {
        this.profiles = this.profiles.filter(p => String(p.userId) !== String(userId));
    }

    // Helper method to set photos for testing
    setPhotos(photos) {
        this.photos = photos;
    }
}

