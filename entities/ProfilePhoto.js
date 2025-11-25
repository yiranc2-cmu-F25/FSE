import ProfilePhotoDac from '../dacs/profilephotoDac.js';
import EmergencyProfile from './EmergencyProfile.js';

class ProfilePhoto {
    constructor({ profileId, photoData, contentType, visibility }) {
        this.profileId = profileId;
        this.photoData = photoData;
        this.contentType = contentType;
        this.visibility = visibility;       
    }

    static get DAO() {
        return ProfilePhotoDac.DAO;
    }

    async upload() {
        await ProfilePhoto.DAO.uploadProfilePhoto(this.profileId, this.photoData, this.contentType, this.visibility);
    }

    static async getProfilePhotoByUserId(userId) {
        // First get the EmergencyProfile to get the profileId
        const profile = await EmergencyProfile.getPersonalEmergencyProfile(userId);
        if (!profile || !profile._id) {
            return null;
        }
        return await ProfilePhoto.DAO.getProfilePhoto(profile._id);
    }

    static async getProfilePhoto(profileId) {
        return await ProfilePhoto.DAO.getProfilePhoto(profileId);
    }

    static async deleteProfilePhotoByUserId(userId) {
        // First get the EmergencyProfile to get the profileId
        const profile = await EmergencyProfile.getPersonalEmergencyProfile(userId);
        if (!profile || !profile._id) {
            return;
        }
        await ProfilePhoto.DAO.deleteProfilePhoto(profile._id);
    }

    static async deleteProfilePhoto(profileId) {
        await ProfilePhoto.DAO.deleteProfilePhoto(profileId);
    }
}

export default ProfilePhoto;