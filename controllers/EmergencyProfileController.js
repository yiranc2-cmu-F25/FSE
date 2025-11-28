import EmergencyProfile from "../entities/EmergencyProfile.js";
import ProfilePhoto from "../entities/ProfilePhoto.js";


export async function getPersonalEmergencyProfile(req, res) {
    try {
        const userId = req.user.id;
        const profile = await EmergencyProfile.getPersonalEmergencyProfile(userId);
        if (!profile) {
            return res.status(404).json({ message: "Emergency profile not found" });
        }
        
        // Try to get photo, but don't fail if photo doesn't exist or can't be fetched
        try {
            // Use profileId (profile._id) to get photo
            const photo = await ProfilePhoto.getProfilePhoto(profile._id);
            if (photo && photo.photoData) {
                // Handle Buffer conversion - support both native Buffer and MongoDB serialized format
                const photoBuffer = photo.photoData;
                const contentType = photo.contentType || 'image/jpeg';
                
                let buffer;
                if (Buffer.isBuffer(photoBuffer)) {
                    // Native Buffer object
                    buffer = photoBuffer;
                } else if (photoBuffer && typeof photoBuffer === 'object' && photoBuffer.type === 'Buffer' && Array.isArray(photoBuffer.data)) {
                    // MongoDB serialized Buffer format: {type: 'Buffer', data: [...]}
                    buffer = Buffer.from(photoBuffer.data);
                } else {
                    console.error("Invalid photo data format:", typeof photoBuffer);
                    throw new Error("Invalid photo data format");
                }
                
                const base64Photo = buffer.toString('base64');
                profile.facePhoto = {
                    data: `data:${contentType};base64,${base64Photo}`,
                    contentType: contentType
                };
                // Include photo visibility in profile visibility if not already set
                if (!profile.visibility) {
                    profile.visibility = {};
                }
                profile.visibility.facePhoto = photo.visibility || 'emergencyOnly';
            }
        } catch (photoErr) {
            // Log error but continue - photo is optional, profile data should still be returned
            console.error("Error fetching profile photo (non-fatal):", photoErr);
            // Don't set facePhoto if there was an error fetching it
        }
        
        res.json(profile);
    } catch (err) {
        console.error("Error fetching emergency profile:", err);
        res.status(500).json({ message: "Error fetching emergency profile" });
    }
}

export async function updatePersonalEmergencyProfile(req, res) {
    try {
        const userId = req.user.id;
        const profileData = req.body;
        
        // If facePhoto visibility is being updated, update the ProfilePhoto as well
        // Only update if visibility.facePhoto is provided and profile has a photo
        if (profileData.visibility && profileData.visibility.facePhoto !== undefined) {
            try {
                const profile = await EmergencyProfile.getPersonalEmergencyProfile(userId);
                // Only proceed if profile exists, has an ID, and has a facePhotoId
                if (profile && profile._id && profile.facePhotoId) {
                    // Get the existing photo to preserve photoData
                    const existingPhoto = await ProfilePhoto.getProfilePhoto(profile._id);
                    if (existingPhoto && existingPhoto.photoData) {
                        // Update only the visibility
                        const photo = new ProfilePhoto({
                            profileId: profile._id,
                            photoData: existingPhoto.photoData,
                            contentType: existingPhoto.contentType || 'image/jpeg',
                            visibility: profileData.visibility.facePhoto
                        });
                        await photo.upload();
                    }
                }
                // If no photo exists, silently ignore the facePhoto visibility update
            } catch (photoErr) {
                // Log but don't fail the entire update if photo visibility update fails
                console.error("Error updating photo visibility (non-fatal):", photoErr);
            }
        }
        
        const updatedProfile = await EmergencyProfile.updatePersonalEmergencyProfile(userId, profileData);
        if (!updatedProfile) {
            return res.status(404).json({ message: "Emergency profile not found" });
        }
        
        // Broadcast emergency profile update via socket
        const socketInstance = req.app.get("socketInstance");
        if (socketInstance) {
            socketInstance.broadcastEmergencyProfileUpdate(userId);
        }
        
        res.json(updatedProfile);
    } catch (err) {
        console.error("Error updating emergency profile:", err);
        res.status(500).json({ message: "Error updating emergency profile", error: err.message });
    }
}

export async function updatePersonalEmergencyProfilePhoto(req, res) {
    try {
        const userId = req.user.id;
        const photoFile = req.file;

        if (!photoFile) {
            return res.status(400).json({ message: "No photo file uploaded" });
        }

        // First get or create the EmergencyProfile to get the profileId
        let profile = await EmergencyProfile.getPersonalEmergencyProfile(userId);
        if (!profile) {
            // Create a basic profile if it doesn't exist
            profile = await EmergencyProfile.updatePersonalEmergencyProfile(userId, {});
        }

        if (!profile || !profile._id) {
            return res.status(500).json({ message: "Failed to get or create emergency profile" });
        }

        const profileId = profile._id; // EmergencyProfile's _id
        const photoData = photoFile.buffer;
        const contentType = photoFile.mimetype || 'image/jpeg';
        const visibility = req.body.visibility || 'emergencyOnly';

        console.log(`[updatePersonalEmergencyProfilePhoto] Uploading photo:`, {
            profileId: String(profileId),
            contentType: contentType,
            mimetype: photoFile.mimetype,
            size: photoFile.size,
            originalname: photoFile.originalname
        });

        const photo = new ProfilePhoto({
            profileId, // This is the EmergencyProfile's _id
            photoData,
            contentType,
            visibility
        });

        await photo.upload();
        
        // After uploading, get the ProfilePhoto to get its _id
        const uploadedPhoto = await ProfilePhoto.getProfilePhoto(profileId);
        if (uploadedPhoto && uploadedPhoto._id) {
            // Update the EmergencyProfile's facePhotoId to reference the ProfilePhoto's _id
            await EmergencyProfile.updatePersonalEmergencyProfile(userId, {
                facePhotoId: uploadedPhoto._id
            });
        }
        
        // Broadcast emergency profile update via socket (photo update is also a profile update)
        const socketInstance = req.app.get("socketInstance");
        if (socketInstance) {
            socketInstance.broadcastEmergencyProfileUpdate(userId);
        }
        
        res.json({ message: "Profile photo updated successfully" });
    } catch (err) {
        console.error("Error updating profile photo:", err);
        res.status(500).json({ message: "Error updating profile photo" });
    }
}

export async function getPersonalEmergencyProfilePhoto(req, res) {
    try {
        const userId = req.user.id;
        const profile = await EmergencyProfile.getPersonalEmergencyProfile(userId);
        
        if (!profile) {
            return res.status(404).json({ message: "Emergency profile not found" });
        }

        if (!profile._id) {
            return res.status(404).json({ message: "Profile ID not found" });
        }

        const photo = await ProfilePhoto.getProfilePhoto(profile._id);
        
        if (!photo || !photo.photoData) {
            return res.status(404).json({ message: "Profile photo not found" });
        }

        // Handle Buffer conversion - support both native Buffer and MongoDB serialized format
        const photoBuffer = photo.photoData;
        const contentType = photo.contentType || 'image/jpeg';
        
        let buffer;
        if (Buffer.isBuffer(photoBuffer)) {
            // Native Buffer object
            buffer = photoBuffer;
        } else if (photoBuffer && typeof photoBuffer === 'object' && photoBuffer.type === 'Buffer' && Array.isArray(photoBuffer.data)) {
            // MongoDB serialized Buffer format: {type: 'Buffer', data: [...]}
            buffer = Buffer.from(photoBuffer.data);
        } else {
            return res.status(500).json({ message: "Invalid photo data format" });
        }
        
        const base64Photo = buffer.toString('base64');
        
        res.json({
            data: `data:${contentType};base64,${base64Photo}`,
            contentType: contentType
        });
    } catch (err) {
        console.error("Error fetching profile photo:", err);
        res.status(500).json({ message: "Error fetching profile photo" });
    }
}

export async function deletePersonalEmergencyProfile(req, res) {
    try {
        const userId = req.user.id;
        await EmergencyProfile.deletePersonalEmergencyProfile(userId);
        
        // Broadcast emergency profile update via socket
        const socketInstance = req.app.get("socketInstance");
        if (socketInstance) {
            socketInstance.broadcastEmergencyProfileUpdate(userId);
        }
        
        res.json({ message: "Emergency profile deleted" });
    } catch (err) {
        console.error("Error deleting emergency profile:", err);
        res.status(500).json({ message: "Error deleting emergency profile" });
    }
}