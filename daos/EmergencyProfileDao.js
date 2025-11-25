import { iEmergencyProfileDao } from "./iEmergencyProfileDao.js";
import mongoose from "mongoose";
import { PROFILE_VISIBILITY } from "../constants/profileVisibility.js";
import { BLOOD_TYPE } from "../constants/bloodType.js";

export class EmergencyProfileDao extends iEmergencyProfileDao {
    constructor({ EmergencyProfileModel, ProfilePhotoModel, UserModel, BookmarkModel }) {
        super();
        this.EmergencyProfileModel = EmergencyProfileModel;
        this.ProfilePhotoModel = ProfilePhotoModel;
        this.UserModel = UserModel;
        this.BookmarkModel = BookmarkModel;
    }

    async getAllEmergencyProfiles() {
        return await this.EmergencyProfileModel.find().populate("facePhotoId").lean();
    }

    async getBookmarkedEmergencyProfiles(userId) {
        // Get all bookmarks for this user
        const bookmarks = await this.BookmarkModel.find({ ownId: userId }).lean();
        if (!bookmarks || bookmarks.length === 0) return [];
        
        // Extract profile IDs from bookmarks
        const profileIds = bookmarks.map(b => b.profileId);
        
        // Get the actual emergency profiles
        return await this.EmergencyProfileModel.find({ _id: { $in: profileIds } }).populate("facePhotoId").lean();
    }

    async bookmarkEmergencyProfile(userId, profileId) {
        // Use upsert to avoid duplicates (unique index handles this)
        await this.BookmarkModel.findOneAndUpdate(
            { ownId: userId, profileId: profileId },
            { ownId: userId, profileId: profileId },
            { upsert: true, new: true }
        );
    }

    async unbookmarkEmergencyProfile(userId, profileId) {
        await this.BookmarkModel.findOneAndDelete({ ownId: userId, profileId: profileId });
    }

    async getPersonalEmergencyProfile(userId) {
        return await this.EmergencyProfileModel.findOne({ userId }).populate("facePhotoId").lean();
    }

    async updatePersonalEmergencyProfile(userId, profileData) {
        const { bloodType, allergies, currentMedications, chronicConditions, emergencyContacts, visibility, facePhotoId } = profileData;
        const updateData = {
            weight: profileData.weight,
            height: profileData.height,
            bloodType: BLOOD_TYPE[bloodType] || BLOOD_TYPE.UNKNOWN,
            allergies: allergies || [],
            currentMedications: currentMedications || [],
            chronicConditions: chronicConditions || [],
            emergencyContacts: emergencyContacts || [],
            visibility: {
                weight: visibility?.weight || PROFILE_VISIBILITY.EMERGENCYONLY,
                height: visibility?.height || PROFILE_VISIBILITY.EMERGENCYONLY,
                bloddType: visibility?.bloodType || PROFILE_VISIBILITY.EMERGENCYONLY,
                allergies: visibility?.allergies || PROFILE_VISIBILITY.EMERGENCYONLY,
                currentMedications: visibility?.currentMedications || PROFILE_VISIBILITY.EMERGENCYONLY,
                chronicConditions: visibility?.chronicConditions || PROFILE_VISIBILITY.EMERGENCYONLY,
                emergencyContacts: visibility?.emergencyContacts || PROFILE_VISIBILITY.EMERGENCYONLY

            }
        };
        
        // Add facePhotoId if provided
        if (facePhotoId !== undefined) {
            updateData.facePhotoId = facePhotoId;
        }
        
        return await this.EmergencyProfileModel.findOneAndUpdate({ userId }, updateData, { new: true, upsert : true}).populate("facePhotoId").lean();
    }

    async deletePersonalEmergencyProfile(userId) {
        await this.EmergencyProfileModel.findOneAndDelete({ userId });
    }
}   