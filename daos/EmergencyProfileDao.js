import { iEmergencyProfileDao } from "./iEmergencyProfileDao.js";
import mongoose from "mongoose";
import { PROFILE_VISIBILITY } from "../constants/profileVisibility.js";
import { BLOOD_TYPE } from "../constants/bloodType.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { getActiveUserIds } from "../utils/filterInactiveUsers.js";

export class EmergencyProfileDao extends iEmergencyProfileDao {
    constructor({ EmergencyProfileModel, ProfilePhotoModel, UserModel, BookmarkModel }) {
        super();
        this.EmergencyProfileModel = EmergencyProfileModel;
        this.ProfilePhotoModel = ProfilePhotoModel;
        this.UserModel = UserModel;
        this.BookmarkModel = BookmarkModel;
    }

    async getAllEmergencyProfiles() {
        const profiles = await this.EmergencyProfileModel.find().populate("facePhotoId").lean();
        
        // Filter out profiles where user is inactive
        if (!profiles || profiles.length === 0) return [];
        
        const userIds = profiles.map(p => p.userId).filter(Boolean);
        const activeUserIds = await getActiveUserIds(userIds);
        
        return profiles.filter(p => p.userId && activeUserIds.has(String(p.userId)));
    }

    async getBookmarkedEmergencyProfiles(userId) {
        // Get all bookmarks for this user
        const bookmarks = await this.BookmarkModel.find({ ownId: userId }).lean();
        if (!bookmarks || bookmarks.length === 0) return [];
        
        // Extract profile IDs from bookmarks
        const profileIds = bookmarks.map(b => b.profileId);
        
        // Get the actual emergency profiles
        const profiles = await this.EmergencyProfileModel.find({ _id: { $in: profileIds } }).populate("facePhotoId").lean();
        
        // Filter out profiles where user is inactive
        if (!profiles || profiles.length === 0) return [];
        
        const profileUserIds = profiles.map(p => p.userId).filter(Boolean);
        const activeUserIds = await getActiveUserIds(profileUserIds);
        
        return profiles.filter(p => p.userId && activeUserIds.has(String(p.userId)));
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
        const profile = await this.EmergencyProfileModel.findOne({ userId }).populate("facePhotoId").lean();
        
        // Check if user is active - only return profile if user is active
        if (!profile) return null;
        
        const user = await this.UserModel.findById(userId).select("status").lean();
        if (!user || user.status !== USER_STATUS.ACTIVE) {
            return null;
        }
        
        return profile;
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