import { iProfilePhotoDao } from "./iProfilePhotoDao.js";

export class inMemoryProfilePhotoDao extends iProfilePhotoDao {
    constructor() {
        super();
        this.photos = [];
    }

    async uploadProfilePhoto(profileId, photoData, contentType, visibility) {
        const existingIndex = this.photos.findIndex(p => String(p.profileId) === String(profileId));
        const photo = {
            _id: existingIndex >= 0 ? this.photos[existingIndex]._id : this.photos.length + 1,
            profileId: profileId,
            photoData: photoData,
            contentType: contentType || "image/jpeg",
            visibility: visibility,
        };
        
        if (existingIndex >= 0) {
            this.photos[existingIndex] = photo;
        } else {
            this.photos.push(photo);
        }
        
        return photo;
    }

    async getProfilePhoto(profileId) {
        return this.photos.find(p => String(p.profileId) === String(profileId)) || null;
    }

    async deleteProfilePhoto(profileId) {
        this.photos = this.photos.filter(p => String(p.profileId) !== String(profileId));
    }
}

