import HelpCenter from "../dacs/HelpCenterDac.js";

export async function getHelpCentersByUserId(req, res) {
    try {
        const userId = req.userId;
        const helpCenters = await HelpCenter.getHelpCenterByUserId(userId);
        return res.status(200).json(helpCenters);
    } catch (err) {
        console.error("Error fetching help centers:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}

export async function getClosestHelpCenters(req, res) {
    try {
        const { coordinates, limit } = req.query;

        // Validate presence
        if (!coordinates) {
            return res.status(400).json({
                status: "error",
                message: "Missing required query parameter: coordinates (format: lon,lat)"
            });
        }

        // Validate format
        const coordsArray = coordinates.split(",").map(Number);
        if (
            coordsArray.length !== 2 ||
            coordsArray.some(num => Number.isNaN(num))
        ) {
            return res.status(400).json({
                status: "error",
                message: "Invalid coordinates format. Expected format: 'longitude,latitude'"
            });
        }

        const helpCenters = await HelpCenter.getClosestHelpCenters({
            coordinates: coordsArray,
            limit: parseInt(limit) || 10
        });

        return res.status(200).json(helpCenters);

    } catch (err) {
        console.error("Error fetching closest help centers:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
}


export async function updateHelpCenter(req, res) {
    try {
        const { id } = req.params;
        const { name, type, location, description, coordinates, owner } = req.body;
        const updatedHelpCenter = await HelpCenter.updateHelpCenter({ id, name, type, location, description, coordinates, owner });

        if (!updatedHelpCenter) {
            // ID not found in database
            return res.status(404).json({
                status: "error",
                message: "Help center not found"
            });
        }

        return res.status(200).json(updatedHelpCenter);
    } catch (err) {
        console.error("Error updating help center:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}

export async function deleteHelpCenter(req, res) {
    try {
        const { id } = req.params;
        const deletedHelpCenter = await HelpCenter.deleteHelpCenter({ id });

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
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}
