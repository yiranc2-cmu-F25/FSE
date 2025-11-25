import { iProfilePhotoDao } from "./iProfilePhotoDao.js";

class ProfilePhotoDao extends iProfilePhotoDao {
    constructor({ ProfilePhotoModel }) {
        super();
        this.ProfilePhotoModel = ProfilePhotoModel;
    }

    async uploadProfilePhoto(profileId, photoData ,contentType, visibility) {
        const existing = await this.ProfilePhotoModel.findOne({ profileId });
        if (existing) {
            existing.photoData = photoData;
            existing.contentType = contentType;
            existing.visibility = visibility;
            return await existing.save();
        }
        return await this.ProfilePhotoModel.create({ profileId, photoData ,contentType, visibility });
    }

    async getProfilePhoto(profileId) {
        // Don't use lean() to preserve Buffer type for photoData
        return await this.ProfilePhotoModel.findOne({ profileId });
    }

    async deleteProfilePhoto(profileId) {
        await this.ProfilePhotoModel.deleteOne({ profileId });
    }
}

export default ProfilePhotoDao;