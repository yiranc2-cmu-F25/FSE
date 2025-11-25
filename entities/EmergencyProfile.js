import EmergencyProfileDac from '../dacs/emergencyprofileDac.js';

class EmergencyProfile {
    constructor({ userId, weight, height, bloodType, allergies, currentMedications, chronicConditions, emergencyContacts, facePhotoId, visibility }) {
        this.userId = userId;
        this.weight = weight;
        this.height = height;
        this.bloodType = bloodType;
        this.allergies = allergies;
        this.currentMedications = currentMedications;
        this.chronicConditions = chronicConditions;
        this.emergencyContacts = emergencyContacts;
        this.facePhotoId = facePhotoId;
        this.visibility = visibility;
    }

    static get DAO() {
        return EmergencyProfileDac.DAO;
    }

    async create() {
        await EmergencyProfile.DAO.create({
            userId: this.userId,
            weight: this.weight,
            height: this.height,
            bloodType: this.bloodType,
            allergies: this.allergies,
            currentMedications: this.currentMedications,
            chronicConditions: this.chronicConditions,
            emergencyContacts: this.emergencyContacts,
            facePhotoId: this.facePhotoId,
            visibility: this.visibility
        });
    }

    static async getAllEmergencyProfiles() {
        return await EmergencyProfile.DAO.getAllEmergencyProfiles();
    }

    static async getBookmarkedEmergencyProfiles(userId) {
        return await EmergencyProfile.DAO.getBookmarkedEmergencyProfiles(userId);
    }

    static async bookmarkEmergencyProfile(userId, profileId) {
        await EmergencyProfile.DAO.bookmarkEmergencyProfile(userId, profileId);
    }

    static async unbookmarkEmergencyProfile(userId, profileId) {
        await EmergencyProfile.DAO.unbookmarkEmergencyProfile(userId, profileId);
    }

    static async getPersonalEmergencyProfile(userId) {
        return await EmergencyProfile.DAO.getPersonalEmergencyProfile(userId);
    }

    static async updatePersonalEmergencyProfile(userId, profileData) {
        return await EmergencyProfile.DAO.updatePersonalEmergencyProfile(userId, profileData);
    }

    static async deletePersonalEmergencyProfile(userId) {
        await EmergencyProfile.DAO.deletePersonalEmergencyProfile(userId);
    }
}

export default EmergencyProfile;