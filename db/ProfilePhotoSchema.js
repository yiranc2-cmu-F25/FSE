import mongoose from "mongoose";
import { PROFILE_VISIBILITY } from "../constants/profileVisibility.js";

export function makeProfilePhotoModel(conn) {
    const ProfilePhotoSchema = new mongoose.Schema({
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmergencyProfile",
            required: true,
            unique: true
        },
        photoData: {
            type: Buffer,
            required: true
        },
        contentType: {
            type: String,
            required: true
        },
        visibility: {
            type: String,
            enum: Object.values(PROFILE_VISIBILITY),
            required: true,
            default: PROFILE_VISIBILITY.EMERGENCYONLY
        }
    });

    return conn.model("ProfilePhoto", ProfilePhotoSchema);
}