import mongoose from "mongoose";
import { PROFILE_VISIBILITY } from "../constants/profileVisibility.js";
import {BLOOD_TYPE} from "../constants/bloodType.js";

export function makeEmergencyProfileModel(conn) {
    const EmergencyProfileSchema = new mongoose.Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        weight: {
            type: Number,
            default: null
        },
        height: {
            type: Number,
            default: null
        },
        bloodType: {
            type: String,
            enum: Object.values(BLOOD_TYPE),
            default: BLOOD_TYPE.UNKNOWN
        },
        allergies: {
            type: [String],
            default: []
        },
        currentMedications: {
            type: [String],
            default: []
        },
        chronicConditions: {
            type: [String],
            default: []
        },
        emergencyContacts: {
            type: [String],
            default: []
        },
        facePhotoId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProfilePhoto",
            default: null
        },
        visibility: {
            weight: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY },
            height: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY },
            bloddType: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY },
            allergies: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY },
            currentMedications: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY },
            chronicConditions: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY },
            emergencyContacts: { type:String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.EMERGENCYONLY }
        }
    });

    return conn.model("EmergencyProfile", EmergencyProfileSchema);
}