import EmergencyProfile from "../entities/EmergencyProfile.js";
import User from "../entities/User.js";
import ProfilePhoto from "../entities/ProfilePhoto.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";


export async function getAllEmergencyProfiles(req, res) {
    try {
        const profiles = await EmergencyProfile.getAllEmergencyProfiles();
        
        // Use Promise.allSettled to ensure we process all profiles even if some fail
        const profilesWithUserStatus = await Promise.allSettled(
            profiles.map(async (profile) => {
                try {
                    if (!profile || !profile.userId) {
                        console.warn("Profile missing userId:", profile);
                        return {
                            profile: {
                                ...profile,
                                username: "Unknown",
                                userStatus: SHARED_STATUS.UNDEFINED
                            },
                            userSharedStatus: SHARED_STATUS.UNDEFINED
                        };
                    }
                    
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
                    console.error(`Error fetching user for profile ${profile?.userId || 'unknown'}:`, err);
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
        
        // Extract successful results, filter out rejected promises
        const successfulProfiles = profilesWithUserStatus
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        // Log any rejected promises for debugging
        const rejectedProfiles = profilesWithUserStatus.filter(result => result.status === 'rejected');
        if (rejectedProfiles.length > 0) {
            console.error(`Failed to process ${rejectedProfiles.length} profiles:`, rejectedProfiles.map(r => r.reason));
        }
        
        const emergencyProfiles = successfulProfiles
            .filter(({ userSharedStatus }) => {
                // Normalize status to lowercase for comparison
                const normalizedStatus = (userSharedStatus || "").toLowerCase();
                return normalizedStatus === SHARED_STATUS.EMERGENCY.toLowerCase();
            })
            .map(({ profile }) => profile);
        
        const otherProfiles = successfulProfiles
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
        res.status(500).json({ message: "Error fetching emergency profiles", error: err.message });
    }
}


export async function getBookmarkedEmergencyProfiles(req, res) {
    try {
        const userId = req.user?.id || req.userId;
        if (!userId) {
            return res.status(401).json({ message: "User ID not found" });
        }
        
        const profiles = await EmergencyProfile.getBookmarkedEmergencyProfiles(userId);
        
        // Use Promise.allSettled to ensure we process all profiles even if some fail
        const profilesWithPhotos = await Promise.allSettled(
            profiles.map(async (profile) => {
                try {
                    if (!profile || !profile.userId) {
                        console.warn("Bookmarked profile missing userId:", profile);
                        return {
                            ...profile,
                            username: "Unknown",
                            userStatus: SHARED_STATUS.UNDEFINED
                        };
                    }
                    
                    const user = await User.findById(profile.userId);
                    
                    // Don't include photo data in response to avoid large payload
                    // Photo will be fetched separately via /api/public/emergency-profiles/:profileId/photo
                    
                    return {
                        ...profile,
                        username: user?.username || "Unknown",
                        userStatus: user?.sharedstatus || SHARED_STATUS.UNDEFINED
                    };
                } catch (err) {
                    console.error(`Error fetching user for bookmarked profile ${profile?.userId || 'unknown'}:`, err);
                    return {
                        ...profile,
                        username: "Unknown",
                        userStatus: SHARED_STATUS.UNDEFINED
                    };
                }
            })
        );
        
        // Extract successful results, filter out rejected promises
        const successfulProfiles = profilesWithPhotos
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        // Log any rejected promises for debugging
        const rejectedProfiles = profilesWithPhotos.filter(result => result.status === 'rejected');
        if (rejectedProfiles.length > 0) {
            console.error(`Failed to process ${rejectedProfiles.length} bookmarked profiles:`, rejectedProfiles.map(r => r.reason));
        }
        
        res.json(successfulProfiles);
    } catch (err) {
        console.error("Error fetching bookmarked emergency profiles:", err);
        res.status(500).json({ message: "Error fetching bookmarked emergency profiles", error: err.message });
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
        
        if (!photo) {
            return res.status(404).json({ error: "Photo not found" });
        }
        
        if (!photo.photoData) {
            return res.status(404).json({ error: "Photo data not found" });
        }
        
        const photoBuffer = photo.photoData;
        let contentType = photo.contentType || 'image/jpeg';
        
        // Detect content type from buffer if stored contentType is missing or incorrect
        let buffer;
        if (Buffer.isBuffer(photoBuffer)) {
            buffer = photoBuffer;
        } else if (photoBuffer && typeof photoBuffer === 'object' && photoBuffer.type === 'Buffer' && Array.isArray(photoBuffer.data)) {
            buffer = Buffer.from(photoBuffer.data);
        } else {
            console.error(`Invalid photo data format for profileId: ${profileId}`);
            return res.status(500).json({ error: "Invalid photo data format" });
        }
        
        // Detect image type from buffer signature if contentType is missing or generic
        if (!photo.contentType || photo.contentType === 'image/jpeg' || photo.contentType === 'application/octet-stream') {
            // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
            if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                contentType = 'image/png';
            }
            // Check JPEG signature: FF D8 FF
            else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
                contentType = 'image/jpeg';
            }
            // Check GIF signature: GIF87a or GIF89a
            else if (buffer.length >= 6 && buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a') {
                contentType = 'image/gif';
            }
            // Check WebP signature: RIFF...WEBP
            else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
                contentType = 'image/webp';
            }
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(buffer);
    } catch (err) {
        console.error("Error fetching profile photo:", err);
        res.status(500).json({ error: "Server error", message: err.message });
    }
}


