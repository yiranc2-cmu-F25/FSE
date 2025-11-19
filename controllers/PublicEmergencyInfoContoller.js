import EmergencyProfile from "../entities/EmergencyProfile.js";
import User from "../entities/User.js";
import ProfilePhoto from "../entities/ProfilePhoto.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";


export async function getAllEmergencyProfiles(req, res) {
    try {
        const profiles = await EmergencyProfile.getAllEmergencyProfiles();
        const profilesWithUserStatus = await Promise.all(
            profiles.map(async (profile) => {
                try {
                    const user = await User.findById(profile.userId);
                    
                    // Don't include photo data in response to avoid large payload
                    // Photo will be fetched separately via /api/public/emergency-profiles/:profileId/photo
                    // Only include facePhotoId if it exists
                    
                    const userStatus = user?.sharedstatus || SHARED_STATUS.UNDEFINED;
                    return {
                        profile: {
                            ...profile,
                            username: user?.username || "Unknown",
                            userStatus: userStatus
                        },
                        userSharedStatus: userStatus
                    };
                } catch (err) {
                    console.error(`Error fetching user for profile ${profile.userId}:`, err);
                    return {
                        profile: {
                            ...profile,
                            username: "Unknown",
                            userStatus: SHARED_STATUS.UNDEFINED
                        },
                        userSharedStatus: SHARED_STATUS.UNDEFINED
                    };
                }
            })
        );
        
        const emergencyProfiles = profilesWithUserStatus
            .filter(({ userSharedStatus }) => {
                // Normalize status to lowercase for comparison
                const normalizedStatus = (userSharedStatus || "").toLowerCase();
                return normalizedStatus === SHARED_STATUS.EMERGENCY.toLowerCase();
            })
            .map(({ profile }) => profile);
        
        const otherProfiles = profilesWithUserStatus
            .filter(({ userSharedStatus }) => {
                // Normalize status to lowercase for comparison
                const normalizedStatus = (userSharedStatus || "").toLowerCase();
                return normalizedStatus !== SHARED_STATUS.EMERGENCY.toLowerCase();
            })
            .map(({ profile }) => profile);
        
        res.json({
            emergency: emergencyProfiles,
            others: otherProfiles
        });
    } catch (err) {
        console.error("Error fetching emergency profiles:", err);
        res.status(500).json({ message: "Error fetching emergency profiles" });
    }
}


export async function getBookmarkedEmergencyProfiles(req, res) {
    try {
        const userId = req.user?.id || req.userId;
        const profiles = await EmergencyProfile.getBookmarkedEmergencyProfiles(userId);
        
        // Process photo data for each profile
        // facePhotoId is populated, so it contains the full ProfilePhoto object
        const profilesWithPhotos = await Promise.all(
            profiles.map(async (profile) => {
                try {
                    const user = await User.findById(profile.userId);
                    
                    // Don't include photo data in response to avoid large payload
                    // Photo will be fetched separately via /api/public/emergency-profiles/:profileId/photo
                    
                    return {
                        ...profile,
                        username: user?.username || "Unknown",
                        userStatus: user?.sharedstatus || SHARED_STATUS.UNDEFINED
                    };
                } catch (err) {
                    console.error(`Error fetching user for bookmarked profile ${profile.userId}:`, err);
                    return {
                        ...profile,
                        username: "Unknown",
                        userStatus: SHARED_STATUS.UNDEFINED
                    };
                }
            })
        );
        
        res.json(profilesWithPhotos);
    } catch (err) {
        console.error("Error fetching bookmarked emergency profiles:", err);
        res.status(500).json({ message: "Error fetching bookmarked emergency profiles" });
    }
}

// Helper function to validate bookmark request
function validateBookmarkRequest(req) {
    const userId = req.user?.id || req.userId;
    const profileId = req.body.profileId;
    
    if (!userId) {
        return { error: { status: 401, message: "User ID not found" } };
    }
    
    if (!profileId) {
        return { error: { status: 400, message: "Profile ID is required" } };
    }
    
    return { userId, profileId: String(profileId) };
}

// Helper function to handle bookmark operation errors
function handleBookmarkError(err, operation) {
    console.error(`Error ${operation} emergency profile:`, err);
    return { 
        status: 500, 
        message: `Error ${operation} emergency profile`, 
        error: err.message 
    };
}

export async function bookmarkEmergencyProfile(req, res) {
    try {
        const validation = validateBookmarkRequest(req);
        if (validation.error) {
            return res.status(validation.error.status).json({ error: validation.error.message });
        }
        
        const { userId, profileId } = validation;
        await EmergencyProfile.bookmarkEmergencyProfile(userId, profileId);
        
        res.json({ message: "Emergency profile bookmarked", profileId });
    } catch (err) {
        const error = handleBookmarkError(err, "bookmarking");
        res.status(error.status).json({ message: error.message, error: error.error });
    }
}

export async function unbookmarkEmergencyProfile(req, res) {
    try {
        const validation = validateBookmarkRequest(req);
        if (validation.error) {
            return res.status(validation.error.status).json({ error: validation.error.message });
        }
        
        const { userId, profileId } = validation;
        await EmergencyProfile.unbookmarkEmergencyProfile(userId, profileId);
        
        res.json({ message: "Emergency profile unbookmarked", profileId });
    } catch (err) {
        const error = handleBookmarkError(err, "unbookmarking");
        res.status(error.status).json({ message: error.message, error: error.error });
    }
}

export async function getProfilePhoto(req, res) {
    try {
        const { profileId } = req.params;
        
        if (!profileId) {
            return res.status(400).json({ error: "Profile ID is required" });
        }
        
        const photo = await ProfilePhoto.getProfilePhoto(profileId);
        
        if (!photo || !photo.photoData) {
            return res.status(404).json({ error: "Photo not found" });
        }
        
        const photoBuffer = photo.photoData;
        const contentType = photo.contentType || 'image/jpeg';
        
        let buffer;
        if (Buffer.isBuffer(photoBuffer)) {
            buffer = photoBuffer;
        } else if (photoBuffer && typeof photoBuffer === 'object' && photoBuffer.type === 'Buffer' && Array.isArray(photoBuffer.data)) {
            buffer = Buffer.from(photoBuffer.data);
        } else {
            return res.status(500).json({ error: "Invalid photo data format" });
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(buffer);
    } catch (err) {
        console.error("Error fetching profile photo:", err);
        res.status(500).json({ error: "Server error", message: err.message });
    }
}


