import HelpCenter from "../entities/HelpCenter.js";


export async function getHelpCentersByUserId(req, res) {
    try {
        const userId = req.userId;

        const helpCenters = await HelpCenter.getHelpCenterByUserId(userId);
        return res.status(200).json(helpCenters || []);
    } catch (err) {
        console.error("Error fetching help centers:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}

export async function getClosestHelpCenters(req, res) {
    try {
        const { coordinates, limit } = req.query;

        // 400 — Required parameter missing
        if (!coordinates) {
            return res.status(400).json({
                status: "error",
                message: "Missing query parameter: coordinates (expected format: lon,lat)"
            });
        }

        // Parse and validate coordinates string: "lon,lat"
        const parts = String(coordinates).split(",");
        if (parts.length !== 2) {
            return res.status(400).json({
                status: "error",
                message: "Invalid coordinates format. Expected: 'longitude,latitude'"
            });
        }

        const lon = Number(parts[0]);
        const lat = Number(parts[1]);

        if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
            return res.status(400).json({
                status: "error",
                message: "Coordinates must be valid numbers. Example: -121.8863,37.3382"
            });
        }

        const validLon = lon >= -180 && lon <= 180;
        const validLat = lat >= -90 && lat <= 90;
        if (!validLon || !validLat) {
            return res.status(400).json({
                status: "error",
                message: "Coordinates out of bounds. Longitude must be between -180 and 180, latitude between -90 and 90."
            });
        }

        const limitNum = parseInt(limit);
        const maxResults = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 10;

        const helpCenters = await HelpCenter.getClosestHelpCenters({
            coordinates: [lon, lat],  // proper [lon, lat] array
            limit: maxResults
        });

        // Always return an array—even if empty
        return res.status(200).json(helpCenters || []);

    } catch (err) {
        console.error("Error fetching closest help centers:", err);

        if (err.name === "ValidationError") {
            return res.status(400).json({
                status: "error",
                message: err.message
            });
        }
        
        return res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
}

export async function updateHelpCenter(req, res) {
    try {
        const { id } = req.params;
        const { name, type, location, description, coordinates } = req.body;

        const updatedHelpCenter = await HelpCenter.updateHelpCenter({ id, name, type, location, description, coordinates });

        if (!updatedHelpCenter) {
            return res.status(404).json({
                status: "error",
                message: "Help center not found"
            });
        }

        return res.status(200).json(updatedHelpCenter);
    } catch (err) {
        console.error("Error updating help center:", err);
        
        if (err.name === "ValidationError") {
            return res.status(400).json({
                status: "error",
                message: err.message
            });
        }

        return res.status(500).json({ status: "error", message: "Server error" });
    }
}

export async function deleteHelpCenter(req, res) {
    try {
        const { id } = req.params;
        console.log("attempting to delete", id)
        const deletedHelpCenter = await HelpCenter.deleteHelpCenter( id );

        if (!deletedHelpCenter) {
            return res.status(404).json({
                status: "error",
                message: "Help center not found"
            });
        }

        return res.status(200).json(deletedHelpCenter);
    } catch (err) {
        console.error("Error deleting help center:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}

export async function registerHelpCenter(req, res) {
    try {
        const { name, type, location, description, coordinates } = req.body;
        const owner = req.userId;

        const helpCenter = new HelpCenter({ name, type, location, description, coordinates, owner });
        console.log("Creating help center:", helpCenter);
        await helpCenter.create();
        return res.status(201).json({ message: "Help center created" });
    } catch (err) {
        console.error("Error creating help center:", err);

        if (err.name === "ValidationError") {
            return res.status(400).json({
                status: "error",
                message: err.message
            });
        }

        return res.status(500).json({ status: "error", message: "Server error" });
    }
}
