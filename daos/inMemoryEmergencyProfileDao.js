import { iEmergencyProfileDao } from "./iEmergencyProfileDao.js";

export class inMemoryEmergencyProfileDao extends iEmergencyProfileDao {
    constructor() {
        super();
        this.profiles = [];
        this.bookmarks = [];
        this.photos = [];
    }

    async getAllEmergencyProfiles() {
        // Return all profiles with facePhotoId populated
        return this.profiles.map(profile => {
            const photo = this.photos?.find(p => p.profileId === String(profile._id || profile.id));
            return {
                ...profile,
                facePhotoId: photo ? { _id: photo._id, profileId: photo.profileId } : null,
            };
        });
    }

    async getBookmarkedEmergencyProfiles(userId) {
        const userBookmarks = this.bookmarks.filter(b => String(b.ownId) === String(userId));
        if (userBookmarks.length === 0) return [];
        
        const profileIds = userBookmarks.map(b => b.profileId);
        const profiles = this.profiles.filter(p => {
            const profileId = String(p._id || p.id);
            return profileIds.includes(profileId);
        });
        
        return profiles.map(profile => {
            const photo = this.photos?.find(p => p.profileId === String(profile._id || profile.id));
            return {
                ...profile,
                facePhotoId: photo ? { _id: photo._id, profileId: photo.profileId } : null,
            };
        });
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

